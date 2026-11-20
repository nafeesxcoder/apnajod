import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests: the real web build in Chromium, with the server's answers
 * faked in each test (e2e/mockApi.ts), so no database or live server is
 * needed. Build first: pnpm e2e:build. Run: pnpm e2e.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // A whole screen of React Native for Web can take a while on a busy CI
  // machine; a real failure still fails, only later.
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node e2e/serve.mjs dist-e2e 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
