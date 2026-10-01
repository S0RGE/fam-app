export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  experimental: { appManifest: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/eslint'],
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    appBaseUrl: process.env.APP_BASE_URL || '',
    public: {},
  },
})
