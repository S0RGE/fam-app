export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  experimental: { appManifest: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/eslint'],
})
