import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import { router } from './router'
import { requestPersistentStorage } from './db/database'

createApp(App).use(createPinia()).use(router).mount('#app')

void requestPersistentStorage()
