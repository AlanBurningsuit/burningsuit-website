import { test, expect } from "@playwright/test";
import { ANALYTICS } from "../src/config/site";

/**
 * The two custom events (404 tracking, email-intent) queue correctly through
 * the enhance.ts stub. The tracker script is routed to an empty body so
 * `window.plausible` stays the queue stub — assertions read the queue itself,
 * with no beacon mocking or counting (csp.spec.ts owns the beacon contract).
 */

const readQueue = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as { plausible?: { q?: unknown[][] } }).plausible?.q ?? []);

test.beforeEach(async ({ page }) => {
  await page.route(ANALYTICS.scriptSrc, (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
});

test("404 page queues a non-interactive 404 event carrying the missed path", async ({ page }) => {
  // http-server does not rewrite missing paths to 404.html — hit the file
  // directly. In production GitHub Pages serves it at the requested path, so
  // location.pathname is the missed URL; here that means "/404.html" itself.
  await page.goto("/404.html", { waitUntil: "load" });
  const q = await readQueue(page);
  expect(q).toContainEqual(["404", { props: { path: "/404.html" }, interactive: false }]);
});

test("mailto click queues an Email click event; regular pages queue no 404", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  // Keep headless browsers from attempting the external mailto protocol —
  // a capture-phase preventDefault; the site's bubble-phase listener still fires.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target as Element | null;
        if (el?.closest?.('a[href^="mailto:"]')) e.preventDefault();
      },
      true,
    );
  });

  // The footer is the fixed basement — reveal it before clicking.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('footer a[href^="mailto:"]').click();

  const q = await readQueue(page);
  expect(q).toContainEqual(["Email click"]);
  expect(q.some((ev) => ev[0] === "404")).toBe(false);
});
