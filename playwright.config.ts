import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// A second copy of the app running as release stage 1 (admin-posted places only), for tests/e2e/stage1.
const STAGE1_PORT = 3101;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Mobile first: test on a phone-sized screen as well as desktop.
  projects: [
    { name: "desktop", testIgnore: "**/stage1/**", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", testIgnore: "**/stage1/**", use: { ...devices["Pixel 7"] } },
    {
      name: "stage1",
      testMatch: "**/stage1/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${STAGE1_PORT}` },
    },
  ],
  // Playwright starts the built app before the tests (run `npm run build` first).
  webServer: [
    {
      command: `npm run start -- --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      // The browser tests need every feature open (the production default is stage 1, the safest).
      env: { RELEASE_STAGE: "4" },
    },
    {
      command: `npm run start -- --port ${STAGE1_PORT}`,
      url: `http://localhost:${STAGE1_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { RELEASE_STAGE: "1" },
    },
  ],
});
