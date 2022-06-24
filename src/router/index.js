import { createRouter, createWebHistory, createWebHashHistory } from '../vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    children: [
      { path: 'a', component: { render: () => <h1>a页面</h1> } },
      { path: 'b', component: { render: () => <h1>b页面</h1> } }
    ],
    beforeEnter (to, from, next) {
      console.log('before enter', to)
    }
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(), // createWebHashHistory
  routes
})

router.beforeEach((to, from, next) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('beforeEach1', to)
      resolve()
    }, 1000)
  })
})

router.beforeEach((to, from, next) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('beforeEach2', to)
      resolve()
    }, 1000)
  })
})

router.beforeResolve((to, from, next) => {
  console.log('beforeResolve', to)
})

router.afterEach((to, from, next) => {
  console.log('afterEach', to)
})

// beforeRouteLeave
// beforeEach
// beforeRouteUpdate
// beforeEnter
// beforeRouterEnter
// beforeResolve
// afterEach

export default router
