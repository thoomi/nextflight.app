import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

// Surface the two public Supabase keys (gitignored .env) into process.env so the
// cloud project can decide whether to run. The default suite never needs them.
const env = loadEnv('development', process.cwd(), '');
if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
if (env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 8765',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
  projects: [
    {
      // Default suite — cloud-free. Runs in `npm run test:e2e` and CI without a
      // Supabase stack. Explicitly ignores the cloud specs.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/cloud/**',
    },
    {
      // Cloud suite — opt-in via `npm run test:e2e:cloud`. Its specs self-skip
      // when SUPABASE_URL is absent, so this project is a no-op (green) without a
      // local stack, including when the default `playwright test` runs all projects.
      name: 'cloud',
      testDir: './tests/e2e/cloud',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
