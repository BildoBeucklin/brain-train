import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Nur nach PIN-Eingabe erreichbar (Guard folgt in Meilenstein 5). */
    requiresPin?: boolean
  }
}

// Hash-History: funktioniert ohne Server-Rewrites, in Tauri wie als PWA.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'start', component: () => import('@/views/StartView.vue') },
    { path: '/training', name: 'training', component: () => import('@/views/TrainingView.vue') },
    { path: '/verlauf', name: 'verlauf', component: () => import('@/views/HistoryView.vue'), meta: { requiresPin: true } },
    { path: '/verwaltung', name: 'verwaltung', component: () => import('@/views/AdminView.vue'), meta: { requiresPin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
