import * as VueRouter from 'vue-router'
import Content from '../views/Content.vue'
import Admin from '../views/Admin.vue'

const routes = [
    { path: '/', component: Content },
    { path: '/admin', component: Admin },
]
const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes
})

export { router }
