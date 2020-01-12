/**
 * 根据时间戳，转换为本地时间字符串。单位: 毫秒
 * @return {string}
 *
 * 备注：
 *    时间戳获取方法: new Date().getTime()
 * */
export function getLocalTime (timestamp) {
  // 注意，单位是毫秒
  let myDate = new Date(timestamp)
  let year = myDate.getFullYear()
  let month = myDate.getMonth() + 1
  let day = myDate.getDate()
  let hours = myDate.getHours()
  let minutes = myDate.getMinutes()
  let second = myDate.getSeconds()
  return year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0')
    + ' ' + hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + second.toString().padStart(2, '0')
}
