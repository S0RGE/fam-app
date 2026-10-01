import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command:
      'npm run dev -- --dotenv .env.example --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/api/v1/health',
    reuseExistingServer: false,
    env: {
      APP_BASE_URL: 'http://127.0.0.1:4173',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'synthetic-e2e-anon-key',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
