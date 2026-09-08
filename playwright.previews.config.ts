import { defineConfig, devices } from "@playwright/test";

/** Temporary comparisons use the DEV server; the normal build emits none. */
export default defineConfig({
  testDir: "./tests/previews",
  outputDir: "./test-results/preview-tests",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4322",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4322",
    url: "http://127.0.0.1:4322/design-preview/elevated/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
