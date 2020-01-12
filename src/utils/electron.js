const Store = window.require('electron-store')
const settingsStore = new Store({ name: 'settings'})

// 获取七牛的同步状态
export function getQiniuSyncStatus() {
  return settingsStore.get('enableAutoSync')
}
