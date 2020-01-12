import React, {useState, useCallback, useEffect} from "react";
import './left.styl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder  } from '@fortawesome/free-regular-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import useContextMenu from "../hooks/useConetxtMenu"
import QiniuManger from '../utils/qiniuManager'
import fileOperator from "../utils/file"
import { getQiniuSyncStatus } from '../utils/electron'
import { syncFile } from '../utils/syncFile'

const { ipcRenderer } = window.require('electron')
const { join } = window.require('path')
const qiniuManager = new QiniuManger()

const Left = ({className, dirs, setDirs, file, setFile, store, filterBody, fileLocation, setLoading}) => {
  const [choose, setChoose] = useState({pid: 0, id: 0})
  const [lastFile, setLastFile] = useState(null)

  const deleteFile = useCallback(async (filterFile) => {
    // 先判断要删除的文件是否还存在
    const filePath = join(fileLocation, `${filterFile.title}.md`)
    const id = filterFile.id
    const pid = filterFile.pid

    // 检测是否存在这个文件
    await fileOperator.isFile(filePath).catch(()=>{
      // 如果不存在，则删除相应的记录
      // 如果没有读取到这个文件，那么就从持久化记录中删除这个文件的信息。
      const dir = dirs.filter(o => o.id === pid)[0]
      for (let i=0; i<dir.list.length; i++) {
        if (id === dir.list[i].id) {
          // 删除掉当前对象
          dir.list.splice(i, 1)
          break
        }
      }
      for (let i=0;i<dirs.length;i++) {
        if (dirs[i].id === pid) {
          dirs[i] = dir
          break
        }
      }
      // 重新回到上次的选项：UI，右侧不用考虑，因为没有发生变化。
      if (lastFile) setChoose({pid: lastFile.pid, id: lastFile.id})
      setDirs([...dirs])
      store.set('dirs', filterBody([...dirs]))
    })
    // 如果存在，才会执行删除操作
    await fileOperator.deleteFile(filePath).then(async () => {
      for (let i=0; i< dirs.length; i++) {
        let node = dirs[i].list
        for (let j=0;j<node.length;j++) {
          if (node[j].id === id) {
            node.splice(j, 1)
            break
          }
        }
      }
      // 因为是用户主动删除，所以默认为，需要自动同步的。用户都删了，说明用户不需要了，以后也不用同步下来。所以云端也要删除。
      await qiniuManager.deleteFile(`${filterFile.title}.md`)
    }).catch(() => {
      // 如果不存在会报错的，这里捕获一下异常就行了。
    })
    // 只有删除文件和当前文件一致，才会清空当前文件的内容
    if (file) {
      if (id === file.id) {
        // 清空当前选中的文件
        setFile(null)
        // 如果删除的是当前选中的对象，还需要清空选择持久化信息
        store.set('id', null)
        store.set('pid', null)
      }
    }
    // 更新列表, 这里必须写成数据结构的方式，或者上面使用深拷贝处理一下。否则会触发hooks的bug,数据变了，但是监控不到变化，UI主动不渲染
    setDirs([...dirs])
    // 更新到本地存储
    store.set('dirs', filterBody([...dirs]))
  }, [file, dirs, setDirs, setFile, fileLocation, store, filterBody, lastFile])

  // 用户自定义的功能菜单, level 是自定义标识，1 表示文件夹，2 表示文件
  const ref = useContextMenu([
    {
      label: '新增文件夹',
      level: 1,
      click() {
        console.log('新增文件夹')
        // 发送请求到父进程, 参数必须是数组类型的值
        ipcRenderer.send('add-dir', [ref.current.dataset, dirs])
      }
    },
    {
      label: '重命名',
      level: 1,
      click() {
        console.log('对文件进行重命名')
        console.log(ref.current.dataset)
      }
    },
    {
      label: '删除文件',
      level: 2,
      click() {
        deleteFile({
          title: ref.current.dataset.title,
          id: ref.current.dataset.id,
          pid: ref.current.dataset.pid
        })
      }
    },
    {
      label: '移动文件',
      level: 2,
      click() {
        console.log('移动文件')
      }
    }
  ], `.${className}`) // 允许的范围就是类名下面的DOM区域。

  const readFile = useCallback(async (filePath, filterFile)=>{
    // 读取本地文件
    await fileOperator.readFile(filePath).then(res => {
      filterFile.body = res
      let newFile = {...filterFile}
      // 保存数据到本地
      for (let i=0; i< dirs.length; i++) {
        for (let j=0;j<dirs[i].list.length;j++) {
          if (dirs[i].list[j].id === newFile.id) {
            dirs[i].list[j] = newFile
            break
          }
        }
      }
      // 先保存文件到上层，后面存储的时候会删掉body
      setFile(newFile)
      // 成功访问的文件，记录下来。这里只是为了ID，所以不用解构
      setLastFile(newFile)
    }).catch(() => {
      // 如果本地不存在，那么就删掉，云端同步的时候，会自动同步下来的。
      for (let i=0; i< dirs.length; i++) {
        for (let j=0;j<dirs[i].list.length;j++) {
          if (dirs[i].list[j].id === filterFile.id) {
            // 删除文件
            dirs[i].list.splice(j, 1)
            break
          }
        }
      }
      setDirs([...dirs])
      store.set('dirs', filterBody([...dirs]))
    })
  }, [store, setDirs, dirs, setFile, filterBody])

  const chooseLine = useCallback(async (dirId, fileId) => {
    let filterFile
    let dir
    if (file && file.newFile) {
      // 设置行号
      setChoose({pid: file.pid, id: file.id})
      dir = dirs.filter(o => o.id === file.pid)[0]
      filterFile = file
      store.set('id', file.id)
      store.set('pid', file.pid)
    } else {
      // 设置行号
      setChoose({pid: dirId, id: fileId})
      store.set('id', fileId)
      store.set('pid', dirId)
      // 获取到选择的文件，返回给上层
      dir = dirs.filter(o => o.id === dirId)[0]
      filterFile = dir.list.filter(o => o.id === fileId)[0]
    }

    // 判断本地和云端的存储情况
    const filePath = join(fileLocation, `${filterFile.title}.md`)
    // 判断是否开启了云同步
    if (getQiniuSyncStatus()) {
      // 同步文件
      setLoading(true)
      await syncFile(filePath, filterFile, setFile, dirs, setDirs, store, filterBody, false).catch(err => {
        console.log(err)
      }).then(() => {
        // 成功访问的文件，记录下来。这里只是为了ID，所以只记录ID就行。
        setLastFile({pid: filterFile.pid, id: filterFile.id})
      })
      setLoading(false)
    } else {
      // 如果没有开启，就直接从本地读取文件
      readFile(filePath, filterFile)
    }
  }, [file, setFile, dirs, setDirs, store, fileLocation, filterBody, setLoading, setLastFile, readFile])

  // 创建新文件的时候，要主动触发一次选择
  useEffect(() => {
    if (file && file.newFile) {
      // 新文件创建，重新选择
      chooseLine(file.pid, file.id)
    }
  }, [file, dirs, chooseLine])

  // 初始渲染的时候，自动模拟用户点击
  useEffect(() => {
    // 列表为空就不处理，只处理有数据的文件夹
    if (dirs && dirs[0].list.length) {
      const id = store.get('id')
      const pid = store.get('pid')
      if (id && pid) {
        chooseLine(pid, id)
      } else {
        const dirID = dirs[0].id
        const fileID = dirs[0].list[0].id
        chooseLine(dirID, fileID)
      }
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, []) // 这里是初始化，并不需要执行多次，也不需要重新渲染。所以不需要监控。所以需要在这里禁用掉eslint的hooks规则

  const changeClass = useCallback((pid, id) => {
    if (pid === choose.pid && id === choose.id) {
      return 'left-file-line select-line'
    } else {
      return 'left-file-line'
    }
  }, [choose])

  return (
    <div className={className}>
      {
        dirs.map(dir => {
          return (
            <div key={dir.id}>
              <div className="left-file-line-header"
                   data-id={dir.id}
                   data-title={dir.title}
                   style={{'user-select': 'none'}}
              >
                <FontAwesomeIcon icon={faFolder} style={{marginRight: 5}}/>
                {dir.title}
              </div>
              {
                dir.list.map(row => {
                  return (
                    <div className={changeClass(dir.id, row.id)}
                         data-pid={dir.id}
                         data-id={row.id}
                         data-title={row.title}
                         onClick={() => chooseLine(dir.id, row.id)}
                         style={{'user-select': 'none'}}
                         key={row.id}>
                      <FontAwesomeIcon icon={faMarkdown} style={{marginRight: 5}}/>
                      {row.title}
                    </div>
                  )
                })
              }
            </div>
          )
        })
      }
    </div>
  )
}

export default Left
