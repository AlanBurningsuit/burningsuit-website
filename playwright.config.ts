import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { defineConfig, devices, webkit } from "@playwright/test";

// Each run owns its listener and tests the existing fresh build.
const port = process.env.BURNINGSUIT_TEST_PORT ? Number(process.env.BURNINGSUIT_TEST_PORT) : await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("No test port"));
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});
// Workers re-import this config; inherit the runner's port rather than choosing another.
process.env.BURNINGSUIT_TEST_PORT = String(port);
const baseURL = `http://127.0.0.1:${port}`;
// CI installs WebKit and always runs its smoke project. Locally it runs when installed (`npx playwright install webkit`, plus
// `npx playwright install-deps webkit` once on Linux), and otherwise is skipped with one line.
const webkitAvailable = !!process.env.CI || existsSync(webkit.executablePath());
if (!webkitAvailable && !process.env.TEST_WORKER_INDEX) console.log("WebKit is not installed here: skipping the webkit-smoke project (CI runs it).");
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  retries: 0,
  timeout: 30_000,
  reporter: "list",
  use: { baseURL, contextOptions: { reducedMotion: "reduce" } },
  projects: [
    {
      name: "chromium",
      // The full suite except the @smoke subset, which repeats the shell checks for WebKit's benefit.
      grepInvert: /@smoke/,
      use: {
        ...devices["Desktop Chrome"],
        // Belt and braces for tests/analytics.ts: Umami's hosts don't resolve, so nothing can reach Umami even past the route guard. UMAMI_LIVE=1 lets the tag itself load live.
        launchOptions: { args: [`--host-resolver-rules=MAP gateway.umami.is ~NOTFOUND${process.env.UMAMI_LIVE === "1" ? "" : ", MAP cloud.umami.is ~NOTFOUND"}`] },
      },
    },
    // WebKit runs only the @smoke subset (tests/smoke.spec.ts); the route guard in tests/analytics.ts still blocks Umami.
    ...(webkitAvailable ? [{ name: "webkit-smoke", grep: /@smoke/, use: { ...devices["Desktop Safari"] } }] : []),
  ],
  webServer: {
    // --ignore-lock keeps Astro 7's preview in the foreground (it backgrounds itself when it detects an agent) and lets parallel runs coexist.
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
