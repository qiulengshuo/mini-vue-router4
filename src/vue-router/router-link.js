import { h, inject } from "vue"

function useLink (props) {
  const router = inject('router')
  function navigate () {
    router.push(props.to)
  }
  return {
    navigate
  }
}

export const RouterLink = {
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true
    }
  },
  setup (props, { slots }) {
    const link = useLink(props)
    // 返回一个渲染函数，渲染函数返回 h 函数调用
    return () => {
      return h('a', {
        onClick: link.navigate
      }, slots.default && slots.default())
    }
  }
}
