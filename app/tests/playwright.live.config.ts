/**
 * Run the e2e specs against the deployed app instead of a local dev server:
 *   LIVE_URL=https://khonaimo.app.space npx playwright test -c tests/playwright.live.config.ts household
 */
import { defineConfig } from '@playwright/test'
import { chromiumLaunchOptions } from 'deepspace/testing'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.LIVE_URL ?? 'https://khonaimo.app.space',
    headless: true,
    launchOptions: chromiumLaunchOptions(),
  },
})
