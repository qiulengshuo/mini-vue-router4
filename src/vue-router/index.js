import { computed, reactive, shallowRef, unref } from "vue"
import { RouterLink } from "./router-link"
import { RouterView } from "./router-view"
import { createWebHashHistory } from "./history/hash"
import { createWebHistory } from "./history/html5"
import { createRouterMatcher } from "./matcher"

// 初始化路由系统的默认参数
const START_LOCATION_NORMALIZED = {
  path: '/',
  // 路径参数
  // params: {},
  // query: {},
  matched: [] // 匹配到的 record 包括父 record 和子 record 。
}

// 发布订阅模式，返回一个事件中心，负责收集订阅和更新列表。
function useCallback () {
  const handlers = []
  function add (handler) {
    handlers.push(handler)
  }
  return {
    add,
    list: () => handlers
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

  // 三个全局路由守卫事件中心
  const beforeGuards = useCallback()
  const beforeResolveGuards = useCallback()
  const afterGuards = useCallback()

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

  // 取到路由变化的 records
  function extractChangeRecords (to, from) {
    const leavingRecords = []
    const updatingRecords = []
    const enteringRecords = []
    const len = Math.max(to.matched.length, from.matched.length)

    for (let i = 0; i < len; i++) {
      const recordFrom = from.matched[i]
      // 先看 from
      if (recordFrom) {
        // 先收集 update (from 有，to 有就是更新)
        if (to.matched.find(record => record.path === recordFrom.path)) {
          updatingRecords.push(recordFrom)
        } else {
          // 再收集 leave (from 有，to 没有就是离开)
          leavingRecords.push(recordFrom)
        }
      }

      // 再看 to
      const recordTo = to.matched[i]
      if (recordTo) {
        // 最后收集 enter (from 没有，to 有就是进入)
        if (!from.matched.find(record => record.path === recordTo.path)) {
          enteringRecords.push(recordTo)
        }
      }
    }

    return [leavingRecords, updatingRecords, enteringRecords]
  }

  // 获取组件守卫
  function extractComponentsGuards (matched, guardType, to, from) {
    const guards = []
    for (const record of matched) {
      // 得到组件对象
      let rawComponent = record.components.default
      // 获取组件中的某个守卫
      const guard = rawComponent[guardType]
      // 把守卫变成 promise 再放进数组中
      guard && guards.push(guardToPromise(guard, to, from, record))
    }
    return guards
  }

  function guardToPromise (guard, to, from, record) {
    return () => new Promise((resolve, reject) => {
      const next = () => resolve()
      let guardReturn = guard.call(record, to, from, next)
      // 如果不调用 next，自动 resolve。
      // 如果调用了，直接 resolve。
      // 如果返回 promise，由 promise 的状态决定。
      return Promise.resolve(guardReturn).then(next)
    })
  }

  function runGuardQueue (guards) {
    return guards.reduce((promise, guard) => promise.then(() => guard()), Promise.resolve())
  }
  async function navigate (to, from) {
    // 全局守卫 beforeGuards beforeResolveGuards afterGuards
    // 组件守卫 extractComponentsGuards
    // 路由守卫 to.matched

    // 得到 离开record 更新record 进入record
    const [leavingRecords, updatingRecords, enteringRecords] = extractChangeRecords(to, from)

    // beforeRouteLeaving
    let guards = extractComponentsGuards(
      leavingRecords.reverse(),
      'beforeRouteLeave',
      to,
      from
    )
    return runGuardQueue(guards).then(() => {
      // beforeEach
      guards = []
      for (const guard of beforeGuards.list()) {
        guards.push(guardToPromise(guard, to, from, guard))
      }
      return runGuardQueue(guards)
    }).then(() => {
      // beforeRouteUpdate
      guards = extractComponentsGuards(
        updatingRecords,
        'beforeRouteUpdate',
        to,
        from
      )
      return runGuardQueue(guards)
    }).then(() => {
      // beforeEnter
      guards = []
      for (const record of to.matched) {
        if (record.beforeEnter) {
          guards.push(guardToPromise(record.beforeEnter, to, from, record))
        }
        return runGuardQueue(guards)
      }
    }).then(() => {
      // beforeRouteEnter
      guards = extractComponentsGuards(
        enteringRecords,
        'beforeRouteEnter',
        to,
        from
      )
      return runGuardQueue(guards)
    }).then(() => {
      // beforeResolve
      guards = []
      for (const guard of beforeResolveGuards.list()) {
        guards.push(guardToPromise(guard, to, from, guard))
      }
      return runGuardQueue(guards)
    })
  }

  function pushWithRedirect (to) {
    // 获取目标路由配置
    const targetLocation = resolve(to)
    const from = currentRoute.value
    console.log(targetLocation)

    // 路由进入前守卫 -> 进入路由 -> afterEach守卫
    navigate(targetLocation, from).then(() => {
      return finalizeNavigation(targetLocation, from)
    }).then(() => {
      // afterEach
      for (const guard of afterGuards.list()) {
        guard(to, from)
      }
    })

  }

  // $router 上的 push
  function push (to) {
    return pushWithRedirect(to)
  }
  // 返回一个路由对象，给 vue 安装插件
  const router = {
    push,
    beforeEach: beforeGuards.add,
    beforeResolve: beforeResolveGuards.add,
    afterEach: afterGuards.add,
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