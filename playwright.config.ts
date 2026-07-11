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
  // The visual tests scroll the whole page then capture 2-5 stabilised region
  // shots — 15-25s each even on Chromium. The 30s default left Firefox timing
  // out mid-capture under any machine load (the historical "about-dog flake"
  // mechanism). Generous is correct for a manual slow-lane tripwire.
  timeout: 90_000,
  // Capped: at the default (~cores/2) this machine launches 7-10 parallel
  // browser instances and FIREFOX times out at page setup (verified 2026-07:
  // whole-project failures at 7 workers, clean at 2). Reliability beats speed
  // for a tripwire suite.
  workers: process.env.CI ? 1 : 4,
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
