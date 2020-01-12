import React, {useEffect, useState, useCallback, useRef} from "react"
import './header.styl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSync, faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import uuid from 'uuid/v4'
import { Input, Button, Avatar } from 'antd'
import useIpcRender from "../hooks/useIpcRender"
import { syncFile, syncFromQiniu } from '../utils/syncFile'
import fileOperator from "../utils/file"

const { join, basename } = window.require('path')
const { remote } = window.require('electron')

// 这里的dir,必须是原始的初始化数据，不能是被过滤后的数据！！！
const Header = ({className, file, setFile, dirs, store, filterBody, setDirs, setSearchDirs, fileLocation, setLoading}) =>{
  // 用于搜索关键字
  const [search, setSearch] = useState('')
  // 用于用户主动搜索
  const [msearch, setMSearch] = useState('')
  // 用于清理搜索关键字
  const searchDom = useRef(null)

  // 用于数据过滤
  const filterList = useCallback((arr, key) => {
    for (let i=0; i<arr.length; i++) {
      let node = arr[i]
      // 没有下级列表的情况下，进行判断
      if (!node.list || !node.list.length) {
        if (!(node.title + '').includes(key) && !(node.body + '').includes(key)) {
          // 不匹配的属性删除掉
          arr.splice(i, 1)
          // 删掉一个元素之后，数组下标应该降一位
          i--
        }
      } else {
        // 存在下级列表的情况下进行判断。
        if (!(node.title + '').includes(key) && !(node.body + '').includes(key)) {
          // 进行递归操作
          filterList(node.list, key)
        }
      }
    }
    return arr
  }, [])

  // 创建一个新的文件
  const newFiles = useCallback(async (e, newName, newBody) => {
    // 设置目录ID
    let pid = uuid()
    // 文件id
    let id = uuid()
    // 我们的删除
    if (dirs) {
      if (file) {
        if (Object.keys(file).includes('pid')) {
          pid = file.pid
        } else {
          pid = dirs[0].id
        }
      } else {
        pid = dirs[0].id
      }
    }
    const title = newName ? newName : '请输入标题'
    const body = newBody ? newBody : '#### 请输入Markdown格式的内容'
    const newFile = {
      id,
      pid,
      title,
      body,
      newFile: true,
      isSynced: false,
      updatedAt: null,
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

    // 判断要添加的文件是不是已经存在
    let filePath = join(fileLocation, `${newFile.title}.md`)

    // 生成不重复的文件名称，这里必须使用同步操作，异步操作会卡死在这里！！！
    await fileOperator.isFile(filePath).then(async () => {
      let needLoop = true
      let count = 0
      while (needLoop) {
        count++
        let newTitle = `${newFile.title}${count}`
        filePath = join(fileLocation, `${newTitle}.md`)
        // eslint-disable-next-line no-loop-func
        await fileOperator.isFile(filePath).catch(() => {
          newFile.title = newTitle
          needLoop = false
        })
      }
    }).catch(()=>{
      // 这里的catch必须保留，如果没有就会出现文件不存在的异常报错！！！
    })

    // 判断当前是不是什么都没有
    if (file) {
      for (let i = 0; i < arr.length; i++) {
        // 这个表示匹配，当前所在的文件目录
        if (arr[i].id === file.pid) {
          // 将文件添加到自己的列表中
          arr[i].list.push(newFile)
          // 添加完了就结束了，没必要继续执行循环了。
          break
        }
      }
    } else {
      // 如果用户没有选中文件，那么默认添加到第一层目录中，一般情况下不会有这个问题。
      arr[0].list.push(newFile)
    }

    // 写文件到真实路径
    fileOperator.writeFile(filePath, newFile.body).then(() => {
      // 保存数据
      setDirs([...arr])
      store.set('dirs', filterBody([...arr]))
      // 搜索列表重置为null，新增文章的时候，要主动变回正常的列表，否则会有问题。
      setSearchDirs(null)
      // 清除掉搜索内容
      setSearch('')
      // 清除掉遗留在UI上的内容，可能是UI组件的BUG，不能自动清理。所以需要ref来辅助清理一下。
      searchDom.current.input.state.value = ''
      // 写入成功后，设置文件信息到列表中。
      // body 的内容，在这里重新设置，因为上面的操作，已经删除了。但是，这个又不能写在前面，列表要先有值，才能选，反过来就提示没文件了。
      newFile.body = body
      setFile(newFile)
    }).catch(err => {
      console.log(err)
    })
  }, [file, setFile, dirs, setDirs, setSearchDirs, store, filterBody, fileLocation])

  // 不知道为什么，依赖某个函数就要写在这个函数的下面，否则无法获取到组件的props参数。
  const importFile = useCallback(()=>{
    remote.dialog.showOpenDialog({
      title: 'test title',
      filters: [{
        name: 'markdown files',
        extensions: ['md']
      }],
      properties: ['openFile', 'multiSelections'],
      message: '请选择要导入的Markdown文件'
    }).then(result => {
      const paths = result.filePaths
      if (Array.isArray(paths) && paths.length > 0) {
        paths.forEach(async file_path => {
          await fileOperator.readFile(file_path).then(data => {
            // 从文件路径中获取文件名称，第二个参数是后缀名，因为这里是固定的后缀，所以直接写死即可。
            // const { basename, extname } = require('path')
            // console.log(basename(addr, extname(addr)))
            // 上面这种写法，可以直接从文件路径中提取任意扩展类型的文件名
            const baseName = basename(file_path, '.md')
            // 利用正则分组，去掉扩展名
            newFiles(null, baseName, data)
          })
        })
        remote.dialog.showMessageBox({
          type: 'info',
          message: `成功导入了${paths.length}个文件!`
        })
      }
    }).catch(err => {
      console.log(err)
    })
  }, [newFiles])

  // 搜索业务的通用逻辑
  const searchFiles = useCallback((key)=>{
    if (key) {
      // 做一个深拷贝, 保证原先的数据不受影响，每次都可以完整赋值
      // 注意！这里不能使用数据结构！！！
      let arr = JSON.parse(JSON.stringify(dirs))
      const res = filterList(arr, key)
      // 将过滤好的数据，传递给搜索展示数组
      setSearchDirs(res)
    } else {
      // 如果查询参数没有值，那么就直接返回默认数据
      setDirs(dirs)
      // 搜索列表重置为null
      setSearchDirs(null)
    }
  }, [dirs, setDirs, setSearchDirs, filterList])

  // 同步云端的文件到本地
  const syncFiles = useCallback(async () => {
    console.log('开始同步')
    // 同步文件
    setLoading(true)

    // 先将本地不存在的文件，从云端下载下来。
    await syncFromQiniu(fileLocation, store, setDirs, filterBody)

    // 然后开始，正式同步
    for (let i=0; i<dirs.length; i++) {
      for (let j=0; j< dirs[i].list.length; j++) {
        const filterFile = dirs[i].list[j]
        // 生成文件路径
        const fileName = `${filterFile.title}.md`
        const filePath = join(fileLocation, fileName)
        console.log('当前处理的文件:', fileName)
        // 调用同步函数
        await syncFile(filePath, filterFile, setFile, dirs, setDirs, store, filterBody, true).catch(err => {
          console.log(err)
          console.log(`文件: ${filterFile}.md 同步失败！`)
        })
      }
    }
    setLoading(false)
    console.log('同步完成')
  }, [setLoading, dirs, setDirs, store, filterBody, setFile, fileLocation])

  // 自动处理搜索请求
  useEffect(() => {
    searchFiles(search)
  },[search, searchFiles])

  // 用户主动触发搜索
  const userStartSearch = useCallback(() => {
    searchFiles(msearch)
  }, [msearch, searchFiles])

  // 搜索控件的响应函数，用于修改搜索关键字
  const handleChange = useCallback((value, e) => {
    setSearch(e.target.value)
  }, [])

  // 自动捕获输入框变化的值
  const getUserInput = useCallback((e) => {
    setMSearch(e.target.value)
  }, [])

  // 响应系统IPC请求
  useIpcRender({
    'create-new-file': newFiles,
    'import-file': importFile,
    'search-file': userStartSearch
  })

  return <div className={className}>
    <div>
      <FontAwesomeIcon icon={faSync} style={{color: '#2c86ec', cursor: "pointer"}} onClick={syncFiles}/>
      <Input.Search
        ref={searchDom}
        placeholder="请输入笔记的标题或内容"
        onSearch={handleChange}
        onChange={getUserInput}
        allowClear
        style={{ width: 260, marginLeft: 30, marginRight: 30}}
      />
      <Button onClick={newFiles}>
        <FontAwesomeIcon icon={faPlus} style={{marginRight: 3}} /> 新增文章
      </Button>
      <Button onClick={importFile} style={{marginLeft: 10}}>
        <FontAwesomeIcon icon={faFileImport} style={{marginRight: 3}} /> 导入文章
      </Button>
    </div>
    <Avatar icon='user' size={36} className='user-icon'/>
    {/*  <Avatar size={49} src={user.avatar_url} /> */}
  </div>
}

export default Header
