export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    appBaseUrl: process.env.APP_BASE_URL || '',
    public: {},
  },
})
