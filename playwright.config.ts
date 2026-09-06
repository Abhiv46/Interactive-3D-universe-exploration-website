import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite for Universe Explorer.
 *
 * Tests the production build exactly as a user ships it:
 *   npm run build && npm run preview
 *
 * The `webServer` below rebuilds + previews on every run, so
 *   npm run test:e2e
 * is all a developer (or CI) needs to run the full suite.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // heavy WebGL app — one browser at a time
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: 'test-results', // screenshots/videos/traces go here

  webServer: {
    command: 'npm run build && npm run preview -- --port 4317 --strictPort',
    url: 'http://localhost:4317',
    // Always rebuild + serve fresh. A leftover `vite preview` from an earlier
    // run silently serves the OLD bundle (camera moved, UI changed...) and the
    // suite then tests a ghost. Never reuse.
    reuseExistingServer: false,
    timeout: 180_000, // `tsc && vite build` can take a while
  },

  use: {
    baseURL: 'http://localhost:4317',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      // Software WebGL so the 3D scene renders in headless CI without a GPU.
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});