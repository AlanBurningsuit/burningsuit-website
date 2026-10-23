import { defineConfig, devices } from "@playwright/test";

/**
 * Gates run against the built site served over HTTP (never file://). The
 * webServer block builds nothing — run `npm run build` first, then the serve
 * script hosts dist/ on :4321. reducedMotion + a frozen clock (per spec) keep
 * the visual snapshots deterministic; the live clock can't diff.
 *
 * Committed snapshot baselines are Windows-specific (…-win32.png suffixes).
 * Playwright includes the running platform in snapshot names, so another
 * platform needs its own reviewed baseline set. CI runs functional tests only.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Scrolling and multiple region captures need more than the default 30s.
  timeout: 90_000,
  // Cap local browser concurrency to avoid resource-related setup timeouts.
  workers: process.env.CI ? 1 : 4,
  reporter: [["list"]],
  expect: {
    timeout: 15_000,
    // Allow small rendering differences while exposing structural shifts.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: "http://localhost:4321",
    // reducedMotion belongs in contextOptions; check:tests guards this shape.
    contextOptions: { reducedMotion: "reduce" },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Firefox needs extra headroom for repeated region captures.
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, timeout: 180_000 },
    // Below-the-ladder coverage (the 48/56/62rem breakpoints all sit above a
    // phone): the mobile nav row, CTA wrap behaviour, single-column layouts.
    // dsf pinned to 1 so baselines stay byte-sane.
    { name: "mobile", use: { ...devices["Pixel 7"], deviceScaleFactor: 1 } },
    // The 390px class of regression (A5). Pixel 7 metrics keep this CHROMIUM —
    // devices["iPhone 12"] would silently select WebKit, whose binary isn't
    // installed here. dsf pinned for byte-sane baselines.
    {
      name: "mobile390",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 664 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
