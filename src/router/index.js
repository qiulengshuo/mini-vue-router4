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
    ]
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

export default router
