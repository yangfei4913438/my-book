import React, {useEffect, useState, useCallback} from "react"
import SimpleMDE from 'react-simplemde-editor'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faLockOpen  } from '@fortawesome/free-solid-svg-icons'
import "easymde/dist/easymde.min.css"
import './right.styl'
import { getLocalTime } from '../utils/time'
import useIpcRender from "../hooks/useIpcRender"
import QiniuManger from '../utils/qiniuManager'
import fileOperator from "../utils/file"
import { getQiniuSyncStatus } from '../utils/electron'
import Markdown from './markdown'

const { join } = window.require('path')
const qiniuManager = new QiniuManger()
const { remote } = window.require('electron')

const Right = ({className, file, setFile, store, filterBody, dirs, setDirs, fileLocation, setLoading}) => {
  const [lock, setLock] = useState(true)
  const [title, setTitle] = useState(file.title)
  const [body, setBody] = useState(file.body)
  const [lastId, setLastId] = useState(null)
  const [titleError, setTitleError] = useState(false)

  // 保存数据
  const saveData = useCallback((saveFile) => {
    // 遍历处理
    for (let i=0;i<dirs.length;i++) {
      // 根据pid确定所属目录
      if (dirs[i].id === saveFile.pid) {
        for (let j=0;j< dirs[i].list.length;j++) {
          if (dirs[i].list[j].id === saveFile.id) {
            dirs[i].list[j] = saveFile
            break
          }
        }
      }
    }
    // 更新列表, 这里必须写成数据结构的方式，或者上面使用深拷贝处理一下。否则会触发hooks的bug,数据变了，但是监控不到变化，UI主动不渲染。
    setDirs([...dirs])
    // 更新到本地存储
    store.set('dirs', filterBody([...dirs]))
  }, [dirs, setDirs, filterBody, store])

  // 手动保存
  const userSaveFile = useCallback(async () => {
    // 修改文件名称
    const oldFile = join(fileLocation, `${file.title}.md`)
    const newFile = join(fileLocation, `${title}.md`)
    if (!titleError && file.title !== title) {
      await fileOperator.renameFile(oldFile, newFile).then(async ()=>{
        // 先在云端删除这个文件
        await qiniuManager.deleteFile(`${file.title}.md`)
        // 设置到列表中去
        file.title = title
      })
    }

    // 修改文件内容, 内容只记录到文件就行了，不用去修改列表
    await fileOperator.writeFile(join(fileLocation, `${file.title}.md`), body).then(() => {
      // 将内容写到当前文件中去。
      file.body = body
    })

    // 将标识设置为关闭
    file.newFile = false
    // 这里必须使用解构
    saveData({...file})
    // 明显的标识就是关闭了编辑功能
    setLock(true)

    // 如果启用了自动同步，那么这里会主动上传
    if (getQiniuSyncStatus()) {
      setLoading(true)
      await qiniuManager.upload(newFile).then(() => {
        remote.dialog.showMessageBox({
          type: 'info',
          message: '文件同步成功!'
        })
        // 修改文件信息，增加同步信息
        const uploadFile = {
          ...file,
          isSynced: true,
          updatedAt: new Date().getTime()
        }
        setFile(uploadFile)
        saveData(uploadFile)
      })
      setLoading(false)
    }
  }, [titleError, body, title, file, setFile, saveData, fileLocation, setLoading])

  // 监听系统ICP请求
  useIpcRender({
    'save-edit-file': userSaveFile
  })

  // 文件发生变化的时候，自动锁定编辑
  useEffect(()=>{
    // 判断是否需要锁
    if (file.newFile) {
      // 初始化锁状态
      setLock(false)
      // 标识为非新文件
      file.newFile = false
      // 保存文件状态，但是不需要修改文件在内存中的值。否则会出问题的！！！！
      saveData({...file})
    } else {
      // 对比当前的文件ID和上一次的文件ID是否一致。如果不一样，那么就锁起来。
      if (file.id !== lastId) {
        // 初始化锁状态
        setLock(true)
      }
    }
    // 设置最近一次的文件ID
    setLastId(file.id)
    // 重新初始化标题
    setTitle(file.title)
    // 重新初始化内容, 如果不存在body, 那么就不更新
    if (file.body) {
      setBody(file.body)
    }
    return () => {
      // 切换文件后，去掉之前没有修正的颜色
      setTitleError(false)
    }
  },[file, setFile, saveData, lastId])

  const handleLock = useCallback(() => {
    // 如果之前是打开的，就主动触发保存数据
    if (!lock) {
      // 触发保存数据的操作
      userSaveFile()
    }
    // 设置新的锁状态
    setLock(!lock)
  }, [lock, userSaveFile])

  const setTitleClass = (err) => {
    if (err) {
      return 'file-info-title-edit-err'
    } else {
      return 'file-info-title-edit'
    }
  }

  const handleChangeTitle = useCallback(e => {
    const name = e.target.value
    // 设置显示名称，这里不能节流，必须保持用户体验
    setTitle(name)
    if (name === file.title) {
      setTitleError(false)
    } else {
      fileOperator.isFile(join(fileLocation, `${name}.md`)).then(() => {
        setTitleError(true)
      }).catch(() => {
        setTitleError(false)
      })
    }
  }, [file, setTitleError, fileLocation])

  const handleOnChange = useCallback((val) => {
    setBody(val)
  },[])

  return (
    <div className={className}>
      <div className="file-info">
        {
          lock
            ? <div className="file-info-title">{title}</div>
            : <input className={setTitleClass(titleError)} value={title} onChange={handleChangeTitle}/>
        }

        <div className='file-info-icon' onClick={handleLock}>
          {lock
            ? <><FontAwesomeIcon icon={faLock} /> <span style={{marginLeft: 5}}>编辑</span></>
            : <><FontAwesomeIcon icon={faLockOpen}/> <span style={{marginLeft: 5}}>阅读</span></>
          }
        </div>
      </div>
      {
        lock
          ? <>
              <div className='file-info-time'>
                <span>创建时间: {getLocalTime(file.createAt)}</span>
                {
                  file.isSynced && <span style={{marginLeft: 15}}>同步时间: {getLocalTime(file.updatedAt)}</span>
                }
              </div>
              <div style={{padding: '0 20px'}}>
                <Markdown content={body} />
              </div>
            </>
          : <SimpleMDE
              key={file.id} // 这个是用来区别不同的内容，不加这个可能会引起内容错乱。
              value={body}
              onChange={handleOnChange}
              options={{
                minHeight: '465px'
              }}
            />
      }
    </div>
  )
}

export default Right
