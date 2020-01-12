const fs = window.require('fs')
const path = window.require('path')

// 递归创建目录 同步方法
function mkdirSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true
    }
  }
}

const fileOperator = {
  readFile: (filePath) => {
    return fs.promises.readFile(filePath, {encoding: 'utf8'})
  },
  writeFile: (filePath, content) => {
    return fs.promises.writeFile(filePath, content, {encoding: 'utf8'})
  },
  renameFile: (oldPath, newPath) => {
    return fs.promises.rename(oldPath, newPath)
  },
  deleteFile: (filePath) => {
    return fs.promises.unlink(filePath)
  },
  isFile: (filePath) => {
    // 判断文件是否可读
    return fs.promises.access(filePath, fs.constants.R_OK)
  },
  // 检测目录，不存在就创建一个
  checkDir: (filePath) => {
    return mkdirSync(filePath)
  }
}

export default fileOperator
