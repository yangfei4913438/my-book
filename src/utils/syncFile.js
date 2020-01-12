import fileOperator from "./file"
import uuid from 'uuid/v4'
import QiniuManger from './qiniuManager'
const qiniuManager = new QiniuManger()
const path = window.require('path')


const updateSyncFileInfo = async (filePath, file, setFile, dirs, setDirs, store, filterBody, ok, onlySync) => {
  // 读取本地文件
  await fileOperator.readFile(filePath).then(data => {
    let newFile = {
      ...file,
      body: data
    }
    // 判断是否同步成功
    if (ok) {
      for (let i=0; i<dirs.length; i++) {
        for (let j=0;j<dirs[i].list.length; j++) {
          if (dirs[i].list[j].id === file.id) {
            // 更新文件信息
            newFile = {
              ...newFile,
              isSynced: true,
              updatedAt: new Date().getTime() // 毫秒时间戳
            }
            // 纯粹同步操作，是不写文件的. 只有当前选中的文件，或者不是纯粹的同步操作，才会写文件。
            if (!onlySync || (store.get('id') === newFile.id && store.get('pid') === newFile.pid)) {
              setFile(newFile)
            }
            // 更新文件
            dirs[i].list[j] = newFile
            break
          }
        }
      }
      setDirs([...dirs])
      store.set('dirs', filterBody([...dirs]))
    } else {
      // 纯粹同步操作，是不写文件的
      if (!onlySync) {
        // 保存文件到上层, 其他无需任何操作
        setFile(newFile)
      }
    }
    return Promise.resolve(true)
  }).catch((err) => {
    console.log(err)
    return Promise.reject(err)
  })
}

// 获取七牛的文件列表, 将本地不存在的文件从云端下载下来。
export const syncFromQiniu = async (fileLocation, store, setDirs, filterBody) => {
  await qiniuManager.getFileList().then(data => {
    const list = data.items
    list.forEach(async item => {
      // 七牛云的时间戳单位是 100纳秒，所以除以10000就是毫秒了。
      const serverUpdateTime = Math.round(item.putTime / 10000)
      // 本地文件的目标路径
      const filePath = path.join(fileLocation, item.key)

      // 匹配本地记录
      let localHas = false
      let localFile = {}
      // 判断是否需要下载
      let needDownload = false

      // 从存储中获取最新的文件列表
      const dirs = store.get('dirs')
      // 如果存在，表示不是新环境，按需下载即可。
      if (dirs) {
        for (let i=0;i<dirs.length;i++) {
          for (let j=0;j<dirs[i].list.length;j++) {
            // 判断本地是否存在这个文件
            if (dirs[i].list[j].title === path.basename(item.key, '.md')) {
              localHas = true
              localFile = dirs[i].list[j]
              break
            }
          }
        }
        if (localHas) {
          if (localFile.updatedAt) {
            // 服务器时间比本地更新时间大，那么就需要下载
            if (serverUpdateTime > localFile.updatedAt) {
              needDownload = true
            }
          } else {
            // 本地没有同步时间，需要从云端下载。
            needDownload = true
          }
        } else {
          // 本地没有数据，也要下载。
          needDownload = true
        }
      } else {
        // 新环境自然是需要下载的
        needDownload = true
      }

      if (needDownload) {
        console.log('开始从云端下载文件:', item.key)
        // 下载文件
        await qiniuManager.downloadFile(item.key, filePath).then(async ()=>{
          console.log('文件下载成功!')
          // 同步成功, 创建新文件
          // 设置目录ID
          let pid = uuid()
          // 文件id
          let id = uuid()
          if (dirs) {
            pid = dirs[0].id
          }
          const newFile = {
            id,
            pid,
            title: path.basename(item.key, '.md'),
            newFile: false,
            isSynced: true,
            updatedAt: new Date().getTime(), // 更新时间和创建时间一致
            createAt: new Date().getTime() // 毫秒时间戳
          }
          // 判断当前是不是什么都没有
          let arr = []
          // 这里说明了，啥都没有的情况
          if (!dirs) {
            arr = [
              {
                id: pid,
                title: '默认的目录名称',
                list: []
              }
            ]
          } else {
            arr = [...dirs]
          }
          // 将新文件添加到列表中
          arr[0].list.push(newFile)
          // 保存数据
          setDirs([...arr])
          store.set('dirs', filterBody([...arr]))
          // 因为下载完成，就表示已经写入到本地了，所以这里，无需执行文件创建流程。
        }).catch( (err)=>{
          // 同步失败，返回错误信息
          console.log('文件下载失败:', err)
        })
      }
    })
  })
}

export const syncFile = async (filePath, file, setFile, dirs, setDirs, store, filterBody, onlySync) => {
  let localHas = false
  let qiniuHas = false
  let serverUpdateTime = null
  // 检测本地有没有文件
  await fileOperator.readFile(filePath).then(() => {
    localHas = true
  }).catch(() => {
    // 如果没有会报错，所以这里要处理一下。
  })
  // 检测云端有没有文件
  await qiniuManager.getStat(`${file.title}.md`).then(resp => {
    qiniuHas = true
    // 七牛云的时间戳单位是 100纳秒，所以除以10000就是毫秒了。
    serverUpdateTime = Math.round(resp.putTime / 10000)
  }).catch(() => {
    // 如果没有会报错，所以这里要处理一下。
  })
  // 第一种情况: 本地有，云端有
  if (localHas && qiniuHas) {
    let needDownload = false
    let needUpload = false
    if (file.updatedAt) {
      // 服务器时间比本地更新时间大，那么就需要下载
      if (serverUpdateTime > file.updatedAt) {
        needDownload = true
      } else if ((file.updatedAt - serverUpdateTime) > 1000 * 60) {
        needUpload = true
      }
    } else {
      // 本地没有同步时间，需要从云端下载。
      needDownload = true
    }
    if (needDownload) {
      await qiniuManager.downloadFile(`${file.title}.md`, filePath).then(async ()=>{
        // 同步成功, 更新文件信息
        return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, true, onlySync)
      }).catch(async ()=>{
        // 同步失败，返回本地文件
        return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, false, onlySync)
      })
    }
    if (needUpload) {
      await qiniuManager.upload(filePath).then(async () => {
        // 同步成功, 更新文件信息
        return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, true, onlySync)
      }).catch(async () => {
        // 同步失败，返回本地文件
        return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, false, onlySync)
      })
    }
    if (!needDownload && !needUpload) {
      // 既不需要下载，又不需要上传的，直接返回本地文件。
      return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, false, onlySync)
    }
  } else if (localHas && !qiniuHas) {
    //  第二种情况: 本地有，云端没有
    await qiniuManager.upload(filePath).then(async () => {
      // 同步成功, 更新文件信息
      return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, true, onlySync)
    }).catch(async (err)=>{
      // 同步失败，返回本地文件
      return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, false, onlySync)
    })
  } else if (!localHas && qiniuHas){
    // 第三种: 本地没有，云端有
    await qiniuManager.downloadFile(`${file.title}.md`, filePath).then(async ()=>{
      // 同步成功, 更新文件信息
      return await updateSyncFileInfo(filePath, file, setFile, dirs, setDirs, store, filterBody, true, onlySync)
    }).catch((err) => {
      // 下载失败，报错，告知用户同步出错!。
      console.log(err)
      return Promise.reject(err)
    })
  } else {
    // 第四种: 本地没有，云端也没有, 删除记录
    // 如果没有读取到这个文件，那么就从持久化记录中删除这个文件的信息。
    for (let i=0; i<dirs.length; i++) {
      for (let j=0;j<dirs[i].list.length; j++) {
        if (dirs[i].list[j].id === file.id) {
          // 删除掉当前对象
          dirs[i].list.list.splice(j, 1)
          break
        }
      }
    }
    setDirs([...dirs])
    store.set('dirs', filterBody([...dirs]))
    return Promise.resolve()
  }
}
