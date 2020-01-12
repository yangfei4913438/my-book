import React, { useCallback } from 'react'
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom'
import { message } from 'antd'
import Home from './pages/home'
import Settings from './pages/settings'

const App = () => {
  // 未匹配的路由，跳转到首页，这里是把url都改成正常的。
  const RouteFallback = useCallback(() => {
    return (
      <>
        {/* 弹出警告 */}
        { message.warning('您访问的页面不存在!', 5) }
        {/* 路由跳转 */}
        <Redirect to='/' />
      </>
    )
  }, [])

  return (
    <>
      {/*
          所有的路由，都要写在 BrowserRouter 组件下面.
          使用 react-router-dom 单页路由，避免每次路由跳转，都要加载整个html页面.
        */}
      <BrowserRouter>
        {/* BrowserRouter 组件下面必须包起来，因为只能有一个DOM元素 */}
        {/* Switch 可以做路由切换 */}
        <Switch>
          {/*
             path: 路径
             exact: 表示需要完全匹配
             component: 路径对应的组件
            */}
          <Route path={"/"} exact component={Home} />
          {/* 设置界面的UI */}
          <Route path={"/settings"} exact component={Settings} />
          {/* 没有找到的都去首页 */}
          <Route component={RouteFallback}/>
        </Switch>
      </BrowserRouter>
    </>
  )
}

export default App
