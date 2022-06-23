import { computed, reactive, shallowRef, unref } from "vue"
import { RouterLink } from "./router-link"
import { RouterView } from "./router-view"
import { createWebHashHistory } from "./history/hash"
import { createWebHistory } from "./history/html5"

// 初始化路由系统的默认参数
const START_LOCATION_NORMALIZED = {
  path: '/',
  // 路径参数
  // params: {},
  // query: {},
  matched: [] // 匹配到的 record 包括父 record 和子 record 。
}

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
  }
  routes.forEach(route => addRoute(route))

  function resolve (location) {
    const matched = []
    let path = location.path
    let matcher = matchers.find(m => m.path === path)
    while (matcher) {
      matched.unshift(matcher.record)
      matcher = matcher.parent
    }
    return {
      path, matched
    }
  }

  return {
    resolve,
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
  // $route
  // 具有响应式，后续只需要改 .value 覆盖，更新视图即可。
  const currentRoute = shallowRef(START_LOCATION_NORMALIZED)

  // 初始化添加 前进后退按钮 回调函数
  let ready
  function markAsReady () {
    if (ready) return
    ready = true
    routerHistory.listen((to) => {
      const targetLocation = resolve(to)
      const from = currentRoute.value
      finalizeNavigation(targetLocation, from, true)
    })
  }

  function finalizeNavigation (to, from, replaced) {
    // 初始化 | replace
    if (from === START_LOCATION_NORMALIZED || replaced) {
      routerHistory.replace(to.path)
    } else {
      // push
      routerHistory.push(to.path)
    }
    // 修改当前 route
    currentRoute.value = to
    // 添加 listen 前进后退回调函数
    markAsReady()
  }

  function resolve (to) {
    // to = "/" to = { path: "/" }
    if (typeof to === 'string') {
      return matcher.resolve({ path: to })
    }
  }

  function pushWithRedirect (to) {
    // 获取目标路由配置
    const targetLocation = resolve(to)
    const from = currentRoute.value
    console.log(targetLocation)
    return finalizeNavigation(targetLocation, from)
  }

  // $router 上的 push
  function push (to) {
    return pushWithRedirect(to)
  }
  // 返回一个路由对象，给 vue 安装插件
  const router = {
    push,
    install (app) {
      console.log('use(router) -> 路由的安装')

      // 挂载 $route 和 $router 到 全局。
      // 组件对象可以通过 this.$route 和 this.$router 获取。
      const router = this
      app.config.globalProperties.$router = router
      // 因为 currentRoute 是响应式的，所以 $route 在获取的时候
      // 也是实时获取。
      Object.defineProperty(app.config.globalProperties, '$route', {
        enumerable: true,
        get: () => unref(currentRoute)
      })

      // 通过 provide 和 inject 使用 router 和 route
      // 路由对象
      const reactiveRoute = {}
      for (const key in START_LOCATION_NORMALIZED) {
        reactiveRoute[key] = computed(() => currentRoute.value[key])
      }
      app.provide('router', router)
      // 提供的值必须是响应式的，依赖于 currentRoute。
      app.provide('route location', reactive(reactiveRoute))

      // 注册路由组件 router-link router-view
      app.component('RouterLink', RouterLink)
      app.component('RouterView', RouterView)

      // 初始化 currentRoute
      if (currentRoute.value === START_LOCATION_NORMALIZED) {
        push(routerHistory.location)
      }
    }
  }
  return router
}

export {
  createWebHashHistory,
  createWebHistory,
  createRouter
}