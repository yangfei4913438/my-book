import { useEffect } from 'react'
const { ipcRenderer } = window.require('electron')

const useIpcRender = (keyCallbackMap) => {
  useEffect(()=>{
    Object.entries(keyCallbackMap).forEach(([key, handler]) => {
      // 监听事件，key 是事件的名称，handler是处理方法。
      ipcRenderer.on(key, handler)
    })
    return () => {
      // 结束后清理
      Object.entries(keyCallbackMap).forEach(([key, handler]) => {
        // 移除事件
        ipcRenderer.removeListener(key, handler)
      })
    }
  },[keyCallbackMap])
}

export default useIpcRender
