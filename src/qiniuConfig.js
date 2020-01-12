/**
 * 就是用来存放一些私有的配置，不会被同步到git上，但是又不会影响项目打包
 *
 * 这里的配置，只和项目有关，和普通用户无关。
 * 普通用户不需要，也不可能为了一个笔记，自己去找七牛云买空间啥的。空间都是笔记服务商提供的。
 * */
const qiniu = window.require('qiniu')

module.exports = {
  // 开发者秘钥
  accessKey: 'hwFnW3aemJliiRtITdPAXiCGK16cHYpJv1KBoV-4',
  secretKey: '-hiqVJ6nhYCFgOnuK5CsGJjHCoaRcFAU0YczG6lW',
  // 公共存储桶的名称
  bucket: 'yangfei-space',
  // 公共存储桶绑定的域名
  publicBucketDomain: 'http://disk.yangfei.org.cn',
  // 存储桶的区域, 具体的值去七牛官网查询，这里参数的意思是华东区域。
  zone: qiniu.zone.Zone_z0,
  // 过期时间, 单位秒
  expires: 3600,
  // 是否使用https, 这个和上面的域名有关，
  useHttps: false,
  // 是否使用cdn, 没钱，不用。。。
  useCdn: false
}
