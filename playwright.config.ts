import { createServer } from "node:net";
import { defineConfig, devices } from "@playwright/test";

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
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  retries: 0,
  timeout: 30_000,
  reporter: "list",
  // Belt and braces for tests/analytics.ts: Umami's hosts don't resolve, so nothing can reach Umami even past the route guard. UMAMI_LIVE=1 lets the tag itself load live.
  use: {
    baseURL, contextOptions: { reducedMotion: "reduce" },
    launchOptions: { args: [`--host-resolver-rules=MAP gateway.umami.is ~NOTFOUND${process.env.UMAMI_LIVE === "1" ? "" : ", MAP cloud.umami.is ~NOTFOUND"}`] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // --ignore-lock keeps Astro 7's preview in the foreground (it backgrounds itself when it detects an agent) and lets parallel runs coexist.
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
