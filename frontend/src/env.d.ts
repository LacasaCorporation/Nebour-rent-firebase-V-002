/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// JS modules used across the hybrid JS/TS codebase
declare module '../services/api'
declare module '../services/api.js'
declare module '../../services/api'
declare module '../stores/auth'
declare module '../stores/auth.js'
declare module '../../stores/auth'
declare module '../utils/imageUrl'
declare module '../utils/imageUrl.js'
declare module '../../utils/imageUrl'
declare module '../composables/useToast'
declare module '../../composables/useToast'
declare module '../router'