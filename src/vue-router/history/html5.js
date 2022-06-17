function buildState (
  back,
  current,
  forward,
  replace = false,
  computedScroll = false
) {
  return {
    back,
    current,
    forward,
    replace,
    scroll: computedScroll,
    position: window.history.length - 1,
  }
}

function createCurrentLocation (base) {
  const { pathname, search, hash } = window.location
  // 如果 base 有 #
  // 只获取 # 后面的路径
  // #/abc -> /abc
  // 如果单独一个 #，直接返回 /，因为首页是 xxx/#/
  const hasPos = base.indexOf('#')
  if (hasPos > -1) {
    return base.slice(1) || '/'
  }
  return pathname + search + hash
}

function useHistoryStateNavigation (base) {
  // 获取当前 url
  const currentLocation = {
    value: createCurrentLocation(base),
  }
  // 获取当前 state
  const historyState = {
    value: window.history.state,
  }
  // 第一次刷新页面,没有状态,需要去添加
  if (!historyState.value) {
    changeLocation(
      currentLocation.value,
      buildState(null, currentLocation.value, null, true),
      true
    )
  }

  function changeLocation (to, state, replace) {
    // base 如果是 #
    // 需要添加上去 #/abc
    const hasPos = base.indexOf('#')
    const url = hasPos > -1 ? base + to : to
    // 跳转并添加状态
    window.history[replace ? 'replaceState' : 'pushState'](state, null, url)
    historyState.value = state
  }

  // data 是 状态
  function push (to, data) {
    // 第一次跳转,原地跳转更新当前状态
    const currentState = Object.assign({}, historyState.value, {
      forward: to,
      scroll: { left: window.pageXOffset, top: window.pageYOffset },
    })
    changeLocation(currentState.current, currentState, true)
    // 第二次跳转,真正跳转更新跳转后的状态
    const state = Object.assign(
      {},
      buildState(currentLocation.value, to, null),
      {
        position: currentState.position + 1,
      },
      data
    )
    changeLocation(to, state, false)
    currentLocation.value = to
  }

  function replace (to, data) {
    // 直接更新 state 和 location
    const state = Object.assign(
      {},
      buildState(
        historyState.value.back,
        to,
        historyState.value.forward,
        true
      ),
      data
    )
    changeLocation(to, state, true)
    currentLocation.value = to
  }

  return {
    location: currentLocation,
    state: historyState,
    push,
    replace,
  }
}

function useHistoryListeners (base, historyState, currentLocation) {
  let listeners = []
  const popStateHandler = ({ state }) => {
    // 获取当前 location
    // 之前 location
    // 之前 state
    const to = createCurrentLocation(base)
    const from = currentLocation.value
    const fromState = historyState.value

    // 赋值最新的 location 和 state
    currentLocation.value = to
    historyState.value = state

    // 判断是不是 back
    let isBack = state.position - fromState.position < 0

    // 执行用户传入的 cb
    listeners.forEach((listener) => {
      listener(to, from, { isBack })
    })
  }
  window.addEventListener('popstate', popStateHandler)
  function listen (cb) {
    listeners.push(cb)
  }

  return {
    listen,
  }
}

// 出口函数,返回提供用户的 API
export function createWebHistory (base = '') {
  // 需要返回 当前状态 state | 当前路径 | push 方法 | replace 方法
  const historyNavigation = useHistoryStateNavigation(base)
  // 监听 前进 后退 函数, 并且修改路径和状态
  const historyListeners = useHistoryListeners(
    base,
    historyNavigation.state,
    historyNavigation.location
  )
  // 整合返回的两大对象
  const routerHistory = Object.assign(
    {},
    historyNavigation,
    historyListeners
  )
  // 代理模式改写属性对应的值,方便直接get对应的值
  Object.defineProperty(routerHistory, 'location', {
    get () {
      historyNavigation.location.value
    },
  })
  Object.defineProperty(routerHistory, 'state', {
    get () {
      historyNavigation.state.value
    },
  })
  return routerHistory
}
