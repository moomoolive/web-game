import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Home from '@/views/Home.vue'
import MainMenu from "@/views/MainMenu.vue"
import Game from "@/views/Game.vue"
import Settings from "@/views/Settings.vue"
import Performance from "@/views/Performance.vue"
import About from "@/views/About.vue"
import NotFound from "@/views/404.vue"

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: "/main-menu",
    name: "MainMenu",
    component: MainMenu
  },
  {
    path: "/game",
    name: "Game",
    component: Game
  },
  {
    path: "/performance",
    name: "Performance",
    component: Performance
  },
  {
    path: "/about",
    name: "About",
    component: About,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
