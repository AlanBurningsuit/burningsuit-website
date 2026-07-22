import { test, expect } from "@playwright/test";
import { ANALYTICS } from "../src/config/site";

/**
 * The meta CSP must hold at runtime — two halves, both load-bearing:
 *   1. the policy EXISTS and carries its load-bearing directives (without
 *      this, deleting `security.csp` from astro.config would pass the spec
 *      vacuously — no policy means no violations), and
 *   2. nothing the page actually loads violates it: no securitypolicyviolation
 *      events (fonts, styles, images, the one external module) and no console
 *      errors / uncaught page errors.
 */
const pages = [
  "/",
  "/ai-fit-for-teams/",
  "/power-bi/",
  "/about/",
  "/work/",
  "/work/law-firm/",
  "/privacy/",
];

for (const path of pages) {
  test(`CSP present and violation-free: ${path}`, async ({ page }) => {
    const problems: string[] = [];
    let analyticsBeacons = 0;
    // The tracker src comes from site.ts so this intercept can't silently go
    // stale against the deployed tag (it did once, generic script.js → pa-*).
    await page.route(ANALYTICS.scriptSrc, (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: 'void fetch("https://plausible.io/api/event", { method: "POST", mode: "no-cors", body: "{}" });',
      }),
    );
    await page.route("https://plausible.io/api/event", (route) => {
      analyticsBeacons++;
      return route.fulfill({ status: 202, body: "{}" });
    });
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) =>
        console.error(
          `CSP blocked ${e.violatedDirective}: ${e.blockedURI || e.sourceFile}`,
        ),
      );
    });
    await page.goto(path, { waitUntil: "load" });

    // Half 1: pin the policy itself.
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy" i]')
      .getAttribute("content");
    expect(csp, "the CSP <meta> must exist").toBeTruthy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src[^;]*'self'/);
    expect(csp).toMatch(/script-src[^;]*https:\/\/plausible\.io/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/plausible\.io/);
    expect(csp).toMatch(/style-src[^;]*'self'/);

    // The personalised tracker embeds the site id in its URL; init lives in
    // enhance.ts, so there is no data-domain attribute to assert.
    const tracker = page.locator(`script[src="${ANALYTICS.scriptSrc}"]`);
    await expect(tracker).toHaveCount(1);

    // Half 2: exercise the page — walk it so below-the-fold lazy resources
    // are actually requested and can surface violations inside the window.
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    await page.waitForTimeout(700);
    // Exactly 1 by construction: the mock tracker body IS the single fetch
    // above and never flushes the enhance.ts queue, so custom events (404,
    // Email click) queue without ever becoming beacons here. The queue-level
    // contract for those events lives in analytics.spec.ts.
    expect(analyticsBeacons, "the analytics tracker did not send its event beacon").toBe(1);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
