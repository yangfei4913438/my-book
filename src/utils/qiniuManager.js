const appConfig = require('../qiniuConfig')
const qiniu = window.require('qiniu')
const axios = window.require('axios')
const fs = window.require('fs')
const { basename } = window.require('path')

class qiniuManager {
  // 传参的时候，直接解构，这样可以不用每个参数都穿。
  constructor() {
    // 生成鉴权对象mac
    this.mac = new qiniu.auth.digest.Mac(appConfig.accessKey, appConfig.secretKey)
    // 存储桶的名称, 应用这里是指定的存储空间，不是用户设置的
    this.bucket = appConfig.bucket
    // 过期时间
    this.expires = appConfig.expires
    // 桶管理对象
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config)
    // 公共存储的域名，这个都是固定的，不是用户设置的。
    this.publicBucketDomain = appConfig.publicBucketDomain

    // 构建配置类
    this.config = new qiniu.conf.Config()
    // 空间对应的机房【Zone_z0 华东】
    this.config.zone = appConfig.zone
    // 是否使用https域名
    this.config.useHttpsDomain = appConfig.useHttps
    // 上传是否使用cdn加速
    this.config.useCdnDomain = appConfig.useCdn
  }

  // 获取文件的下载链接，注意: 错误的文件名也是可以获取到一个连接的，只不过这个连接请求不到任何东西。。。
  getFileUrl (fileName) {
    return this.bucketManager.publicDownloadUrl(this.publicBucketDomain, fileName)
  }

  // 下载文件
  downloadFile (fileName, targetPath) {
    // 第一步，获取下载链接
    let url = this.getFileUrl(fileName)
    const timeStamp = new Date().getTime()
    // 组装出唯一的请求url
    url = `${url}?timestamp=${timeStamp}`
    // 第二步，请求下载的可读流
    return axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'Cache-Control': 'no-cache'
      }
    }).then(res => {
      // 创建可以可写入流的对象
      const writer = fs.createWriteStream(targetPath)
      // 写入数据
      res.data.pipe(writer)
      // 使用写入流的事件监听功能，生成promise对象
      return new Promise((resolve, reject)=>{
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
    }).catch(err => {
      // 本身的错误信息，返回一个promise错误实例。
      return Promise.reject({err: err.response})
    })
  }

  upload (localFilePath) {
    // 文件名称（包含扩展名）
    const key = basename(localFilePath)

    // 生成上传对象
    const options = {
      scope: this.bucket + ':' + key, // 强制替换存储空间中文件的名称
      expires: this.expires // 默认值为3600秒
    }
    // 上传策略
    const putPolicy = new qiniu.rs.PutPolicy(options)
    // 上传凭证
    const uploadToken = putPolicy.uploadToken(this.mac)
    const formUploader = new qiniu.form_up.FormUploader(this.config)
    const putExtra = new qiniu.form_up.PutExtra()

    // 文件上传
    return new Promise((resolve, reject)=>{
      formUploader.putFile(uploadToken, key, localFilePath, putExtra, this.handleCallback(resolve, reject))
    })
  }

  deleteFile(key) {
    // 删除
    return new Promise((resolve, reject)=>{
      this.bucketManager.delete(this.bucket, key, this.handleCallback(resolve, reject))
    })
  }

  getFileList() {
    // 获取文件列表
    return new Promise((resolve, reject)=> {
      this.bucketManager.listPrefix(this.bucket, null, this.handleCallback(resolve, reject))
    })
  }

  getStat(key) {
    // 获取文件状态
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(this.bucket, key, this.handleCallback(resolve, reject))
    })
  }

  // 高阶函数外层接收promise的2个处理函数。
  handleCallback (resolve, reject) {
    // 返回一个回调函数
    return (respErr, respBody, respInfo) => {
      if (respErr) {
        throw respErr
      }
      if (respInfo.statusCode === 200) {
        resolve(respBody)
      } else {
        // 出错的时候，将状态码和消息都返回出去。
        reject({
          statusCode: respInfo.statusCode,
          body: respBody
        })
      }
    }
  }
}

export default qiniuManager
