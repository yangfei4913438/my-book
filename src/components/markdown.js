import React, { memo, useMemo } from 'react'
import MarkDownIt from 'markdown-it'
import 'github-markdown-css'

// 实例化一个markdown对象
const md = new MarkDownIt({
  html: true, // 支持html标签 如: <img />
  linkify: true, // url链接，变成可点击链接。
})

// 使用memo封装的组件函数，在值不发生变化的时候，不会重新渲染。
// 如果不使用memo封装，那么即使这个子组件不是写在引用组件里面的，也依然会被重复执行。
// 注意，这里是一个子组件，所以参数必须使用对象结构的方式来写。否则传参会出错！！！
export default memo(function MarkdownRender({ content }) {

  // 将markdown文件进行渲染, markdown 没有变化的时候，无需重新渲染
  const html = useMemo(() => md.render(content), [content])

  // 将html文件渲染到react中
  return (
    <div className='markdown-body'>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
})
