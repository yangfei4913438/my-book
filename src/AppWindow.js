const { BrowserWindow } = require('electron')

class AppWindow extends BrowserWindow {
  constructor (config, urlLocation) {
    // 默认配置
    const basicConfig = {
      width: 800,
      height: 600,
      webPreferences: { // 主窗口配置
        nodeIntegration: true, // 允许在窗口中使用node命令
      },
      show: false, // 默认不显示
      backgroundColor: '#efefef'
    }

    // 将用户配置，替换掉默认配置
    const finalConfig = { ...basicConfig, ...config}

    // 调用super函数
    super(finalConfig)

    // 加载url页面
    this.loadURL(urlLocation)

    // 在加载页面时，渲染进程第一次完成绘制时，会发出 ready-to-show 事件。在此事件后显示窗口将没有视觉闪烁.
    // 也就是说，不会先给用户一个白屏，再加载内容。而是直接显示已经渲染完成的内容。
    this.once('ready-to-show', ()=>{
      // 显示窗口
      this.show()
    })
  }
}

module.exports = AppWindow
