const os = require('os')
const path = require('path')
const fs = require('fs')
const http = require('http')
const Koa = require('koa')
const KoaStatic = require('koa-static')
const moment = require('moment')
const { port } = require('./serverConfig')
const { app, Menu, ipcMain, dialog } = require('electron')
const isDev = require('electron-is-dev')
const { autoUpdater } = require('electron-updater')
const menuTemplate = require('./src/menuTemplate')
const AppWindow = require('./src/AppWindow')

const Store = require('electron-store')
const settingsStore = new Store({ name: 'settings'})
const packageConf = require('./package.json')

const logFilePath = path.join(os.homedir(), `.${packageConf.name}`, 'log.txt') // 日志文件目录

// 禁用GPU渲染，因为此款应用不含有webgl和3D CSS动画内容。
app.disableHardwareAcceleration()

// 获取可用端口
function checkPort (port) {
  const serve = http.createServer().listen(port)
  return new Promise((resolve, _) => {
    serve.on('listening', _ => {
      serve.close()
      resolve(port)
    })
    serve.on('error', async _ => {
      resolve(await checkPort(port + 1))
    })
  })
}
// 获取可用端口
const serverPort = async () => {
  let res = await checkPort(port)
  return res
}

// 日志系统
function log (content) {
  isDev ? console.log(content)
    : fs.appendFileSync(logFilePath, `${moment().format('YYYY/MM/DD HH:mm:ss')} ${content}\n`)
}

// Electron 会在初始化后并准备
// ready事件 表示electron已经加载了
app.on('ready', () => {
  log('=============================================')
  log('当前开发环境:' + isDev)

  // 生产环境运行前检查更新。
  // 关闭自动下载
  autoUpdater.autoDownload = false
  // 检测更新，这里不要使用同步操作！！！
  autoUpdater.checkForUpdatesAndNotify()
  // 检测错误
  autoUpdater.on('error', error => {
    dialog.showErrorBox('Error: ', error === null ? 'unknown' : (error.stack || error).toString())
  })
  autoUpdater.on('checking-for-update', () => {
    log('Checking for update...');
  })
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '应用有新的版本',
      message: '发现新版本，是否现在更新?',
      buttons: ['是', '否']
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
      title: '没有新版本',
      message: '当前已经是最新版本'
    })
  })
  // 下载
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message)
  })
  //
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      title: '安装更新',
      message: '更新下载完毕，应用将重启并进行安装'
    }, () => {
      setImmediate(() => autoUpdater.quitAndInstall())
    })
  })

  // 创建浏览器主窗口配置
  const newPort = serverPort()
  const mainWindowConfig = {
    width: 1200,
    height: 680,
    title: app.name
  }

  let createWindow = {
    open: false
  }
  if (!isDev) {
    Object.defineProperty(createWindow, 'open', {
      configurable: false,
      enumerable: false,
      set () {
        log("生产环境，开始加载app窗口。。。")
        loadWindow(mainWindowConfig, newPort)
      }
    })
  } else {
    log("开发环境，开始加载app窗口。。。")
    loadWindow(mainWindowConfig, newPort)
  }
  if (!isDev) {
    // 启动服务器
    const serve = new Koa()
    // 加载静态文件资源
    serve.use(KoaStatic(__dirname))
    serve.use(async ctx => {
      ctx.type = 'text/html;charset=utf-8'
      try {
        ctx.body = fs.readFileSync(path.join(__dirname, './index.html'))
      } catch (error) {
        ctx.body = 'fail no file!'
      }
    })
    log(`正在启动服务器在${newPort}端口`)
    serve.listen(newPort, () => {
      createWindow.open = true
      log(`serve is running at ${newPort}...`)
    })
  }
})

function loadWindow(mainWindowConfig, serverPort) {
  // 根据环境设置React入口页面的URL
  const urlLocation = `http://127.0.0.1:${serverPort}`

  // 实例化主窗口界面
  let mainWindow = new AppWindow(mainWindowConfig, urlLocation)

  // 进行关闭的时候，清空变量，回收内存。
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 根据配置文件，设置菜单的内容
  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // 自动保存修改
  ipcMain.on('auto-save-upload', ()=>{
    // 获取到自动同步选项, 不是苹果系统要少一列菜单，所以是第3列，苹果系统是第四列。
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
    // 获取选中状态，自动同步的设置是第一项，所以索引为0
    let checked = qiniuMenu.submenu.items[0].checked
    // 将选中状态写入到配置文件，便于其他地方获取用户的选择。
    settingsStore.set('enableAutoSync', checked)
  })

  // 响应设置事件，也就是设置弹框
  ipcMain.on('open-settings-window', ()=>{
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      title: '设置',
      parent: mainWindow
    }
    const settingsFileLocation = `http://127.0.0.1:${serverPort}/settings`
    let settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })

  // 文件夹重命名事件
  ipcMain.on('add-dir', (event, args) => {
    console.log(event, args)
  })
  // 创建文件夹事件

  // 移动文件事件
}
