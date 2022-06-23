import { h, inject, computed, provide } from "vue"

export const RouterView = {
  name: 'RouterView',
  setup (props, { slots }) {
    // 第一层 depth 默认为 0  -> /
    const depth = inject('depth', 0)
    const injectRoute = inject('route location')
    // 获取对应 record 并响应式
    const matchedRouteRef = computed(() => injectRoute.matched[depth])
    // 下面一层需要加一 -> /a
    provide('depth', depth + 1)
    return () => {
      // setup 返回的渲染函数会做为 render 函数。
      // effect(() => { render() })。
      // 当执行 render，matchedRouteRef 收集当前的 组件effect。
      // 当 injectRoute.matched 发生改变，触发更新。
      const matchRoute = matchedRouteRef.value
      const viewComponent = matchRoute && matchRoute.components.default

      if (!viewComponent) {
        return slots.default && slots.default()
      }
      // 渲染路由组件
      return h(viewComponent)
    }
  }
}