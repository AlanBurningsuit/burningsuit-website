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
  use: { baseURL, contextOptions: { reducedMotion: "reduce" } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
