import React, {useCallback, useState} from "react"
import './settings.styl'
import { Input, Button } from 'antd'

const path = window.require('path')
const { remote } = window.require('electron')
const Store = window.require('electron-store')
const store = new Store({'name': 'settings'})


const Settings = () => {
  const [savePath, setSavePath] = useState(store.get('fileLocation'))

  const handleOpenDir = useCallback(() => {
    remote.dialog.showOpenDialog({
      defaultPath: path.dirname(savePath), // 取默认值的上级
      properties: ['openDirectory'],
    }).then(res => {
      // 有值才会更新，取消的时候，返回的是空数组。
      // 保存第一个就对了，因为这里只能选一个目录。
      if (res.filePaths.length) setSavePath(res.filePaths[0])
    })
  }, [savePath])

  const handleSavePath = () => {
    store.set('fileLocation', savePath)
    // 保存完成后，关闭当前窗口
    remote.getCurrentWindow().close()
  }

  return (
    <div className={'settings'}>
      <h4>设置</h4>
      <p>选择文件存储位置</p>
      <div className="settings-save-path">
        <Input placeholder={"当前存储地址"}
               value={savePath}
               disabled // 设置禁止修改是为了避免用户设置了什么不存在的路径，引起BUG
               style={{borderTopRightRadius: 0, borderBottomRightRadius: 0, fontSize: 12}}/>
        <Button type={"primary"} onClick={handleOpenDir} style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}>
          选择新的位置
        </Button>
      </div>
      <div style={{marginTop: 15}}>
        <Button type="primary" onClick={handleSavePath}>保存</Button>
      </div>
    </div>
  )
}

export default Settings
