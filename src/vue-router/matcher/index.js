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

export { createRouterMatcher }