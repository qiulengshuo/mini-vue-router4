import { createWebHashHistory } from "./history/hash"
import { createWebHistory } from "./history/html5"

function normalizedRouteRecord (record) {
  return {
    path: record.path,
    meta: record.meta || {},
    beforeEnter: record.beforeEnter,
    name: record.name,
    components: {
      default: record.component
    },
    children: record.children || {}
  }
}

function createRouteRecordMatcher (record, parent) {
  const matcher = {
    path: record.path,
    record,
    parent,
    children: []
  }
  // 得到 parent 的 matcher，push 进 children
  if (parent) {
    parent.children.push(matcher)
  }
  return matcher
}

function createRouterMatcher (routes) {
  const matchers = []
  // 给每个路由添加记录
  function addRoute (route, parent) {
    // 初次修改
    let normalizedRecord = normalizedRouteRecord(route)
    // 添加parent，第二次修改
    if (parent) {
      normalizedRecord.path = parent.path + normalizedRecord.path
    }
    const matcher = createRouteRecordMatcher(normalizedRecord, parent)

    // 遍历递归 children，并把修改后的 父路由 匹配对象传入。
    if ('children' in normalizedRecord) {
      let children = normalizedRecord.children
      for (let i = 0; i < children.length; i++) {
        addRoute(children[i], matcher)
      }
    }

    matchers.push(matcher)
    console.log(matchers)
  }
  routes.forEach(route => addRoute(route))
  return {
    // 动态添加路由的函数
    addRoute
  }
}

// 处理用户传过来的 options
// {
//   history: createWebHistory(),
//   routes: [{}, {}...]
// }

function createRouter (options) {
  // 获取 mode
  const routerHistory = options.history
  // 格式化路由配置 -> 拍平
  const matcher = createRouterMatcher(options.routes)
  // 返回一个路由对象，给 vue 安装插件
  const router = {
    install (app) {
      console.log('use(router) -> 路由的安装')
      app.component('RouterLink', {
        setup: (props, { slots }) => () => <a>{slots.default && slots.default()}</a>
      })
      app.component('RouterView', {
        setup: (props, { slots }) => () => <div></div>
      })
    }
  }
  return router
}

export {
  createWebHashHistory,
  createWebHistory,
  createRouter
}