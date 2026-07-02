import { defineConfig, devices } from "@playwright/test";

/**
 * Gates run against the built site served over HTTP (never file://). The
 * webServer block builds nothing — run `npm run build` first, then the serve
 * script hosts dist/ on :4321. reducedMotion + a frozen clock (per spec) keep
 * the visual snapshots deterministic; the live clock can't diff.
 *
 * Snapshot baselines are generated and committed on THIS Windows machine
 * (…-win32.png suffixes): test:visual is pinned to win32 by Playwright's
 * default snapshot naming. On Linux/CI every baseline reports "missing"
 * rather than diffing — regenerate a platform set there before relying on it.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  expect: {
    timeout: 15_000,
    // The rebuild legitimately changes pixels (self-hosted fonts, Manrope 700,
    // AVIF). The visual gate is a regression tripwire, not a pixel oracle:
    // small per-pixel tolerance, but structural/layout shifts must show up.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: "http://localhost:4321",
    // NOTE: reducedMotion is a CONTEXT option, not a flattened test option.
    // The old `reducedMotion: "reduce"` at this level type-checked nowhere and
    // was silently ignored at runtime — every "reduced-motion" run before
    // 2026-07-02 actually ran with normal motion. check:tests now guards this.
    contextOptions: { reducedMotion: "reduce" },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // Below-the-ladder coverage (the 48/56/62rem breakpoints all sit above a
    // phone): the mobile nav row, CTA wrap behaviour, single-column layouts.
    // dsf pinned to 1 so baselines stay byte-sane.
    { name: "mobile", use: { ...devices["Pixel 7"], deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
