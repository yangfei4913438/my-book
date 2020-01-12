// 用于数据过滤
const filterBody = (arr) => {
  for (let i=0; i<arr.length; i++) {
    let node = arr[i]
    // 没有下级列表的情况下，进行判断
    if (!node.list || !node.list.length) {
      // 如果存在body属性，就删掉这个属性
      if (node.body) {
        delete node.body
      }
    } else {
      // 进行递归操作
      filterBody(node.list)
    }
  }
  return arr
}

export {
  filterBody
}
