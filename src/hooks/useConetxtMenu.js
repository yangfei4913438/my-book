import { useEffect, useRef } from 'react'
const { remote } = window.require('electron')
// 右键菜单和子菜单
const { Menu, MenuItem } = remote

const useContextMenu = (itemArr, targetSelector) => {
  const clickedElement = useRef(null)

  useEffect(() => {
    // 创建菜单弹出事件函数
    const handleContextMenu = (e) => {
      // 只有指定的DOM才允许使用, 也就是点击的对象，是指定区域内的，才会弹出菜单。
      // 第二个选项表示，只有DOM节点的数据集中存在ID属性，才会弹出菜单，避免空白区域也弹出菜单。
      if (document.querySelector(targetSelector).contains(e.target) && e.target.dataset.id) {
        // 将用户点击的DOM赋值给一个持久化的对象
        clickedElement.current = e.target
        // 实例化菜单对象
        const menu = new Menu()
        // 遍历数据生成功能菜单
        itemArr.forEach(item => {
          if (e.target.dataset.pid) {
            // 存在pid的就是普通文件
            if (item.level === 2) {
              // 删掉辅助标识
              // delete item.level
              menu.append(new MenuItem(item))
            }
          } else {
            // 不存在pid的就是目录
            if (item.level === 1) {
              // 删掉辅助标识
              // delete item.level
              menu.append(new MenuItem(item))
            }
          }
        })
        // 绑定到window
        menu.popup({window: remote.getCurrentWindow()})
      }
    }
    // 增加菜单事件监听
    window.addEventListener('contextmenu', handleContextMenu)
    return () => {
      // 结束的时候，移除事件监听
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [itemArr, targetSelector])

  // 将鼠标右键选中的对象元素，返回出去
  return clickedElement
}

export default useContextMenu
