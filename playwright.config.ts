import { defineConfig, devices } from "@playwright/test";

/**
 * Gates run against the built site served over HTTP (never file://). The
 * webServer block builds nothing — run `npm run build` first, then the serve
 * script hosts dist/ on :4321. reducedMotion + a frozen clock (per spec) keep
 * the visual snapshots deterministic; the live clock can't diff.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  expect: {
    // The rebuild legitimately changes pixels (self-hosted fonts, Manrope 700,
    // AVIF). The visual gate is a regression tripwire, not a pixel oracle:
    // small per-pixel tolerance, but structural/layout shifts must show up.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: "http://localhost:4321",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
