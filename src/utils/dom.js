// 获取父节点的DOM节点
export const getParentNode = (node, parentClassName) => {
  let current = node
  // null 表示节点的上层没有DOM了。
  while (current !== null) {
    // 判断节点的类列表，是否包含父节点的类名
    if (current.classList.contains(parentClassName)) {
      // 包含就直接返回
      return current
    }
    // 不包含，就把检测节点就上浮一层，最终会上浮到html的最外层，也就是父节点为null, 遍历终止。
    current = current.parentNode
  }
  // 如果一直上浮到最顶层都没有，那就是不存在的父节点类名了
  return false
}
