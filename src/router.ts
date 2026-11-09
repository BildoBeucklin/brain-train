import { createRouter, createWebHashHistory } from 'vue-router'

// Hash-History: funktioniert ohne Server-Rewrites, in Tauri wie als PWA.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/moderation' },
    { path: '/moderation', name: 'moderation', component: () => import('@/views/ModerationView.vue') },
    { path: '/praesentation', name: 'praesentation', component: () => import('@/views/PresentationView.vue') },
    { path: '/inhalte', name: 'inhalte', component: () => import('@/views/ContentView.vue') },
    { path: '/einstellungen', name: 'einstellungen', component: () => import('@/views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/moderation' },
  ],
})
