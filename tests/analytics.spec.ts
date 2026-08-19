import { test, expect } from "@playwright/test";
import { ANALYTICS } from "../src/config/site";

/**
 * The four custom events (404 tracking, email-intent, booking-intent,
 * study-read) reach umami.track() correctly. The tracker script is routed to a recording stub that defines
 * window.umami before enhance.ts runs (the mocked tag is a defer script in
 * <head>, the module runs at end of body), so assertions read the recorded
 * calls — no beacon mocking or counting (csp.spec.ts owns the beacon
 * contract).
 */

type Recorder = { __umamiCalls?: unknown[][] };

const readCalls = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as Recorder).__umamiCalls ?? []);

test.beforeEach(async ({ page }) => {
  await page.route(ANALYTICS.scriptSrc, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.umami = { track: (n, d) => (window.__umamiCalls = window.__umamiCalls || []).push(d === undefined ? [n] : [n, d]) };",
    }),
  );
});

test("404 page tracks a 404 event carrying the missed path", async ({ page }) => {
  // http-server does not rewrite missing paths to 404.html — hit the file
  // directly. In production GitHub Pages serves it at the requested path, so
  // location.pathname is the missed URL; here that means "/404.html" itself.
  await page.goto("/404.html", { waitUntil: "load" });
  const calls = await readCalls(page);
  expect(calls).toContainEqual(["404", { path: "/404.html" }]);
});

test("mailto click tracks an Email click event; regular pages track no 404", async ({ page }) => {
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

  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Email click"]);
  expect(calls.some((ev) => ev[0] === "404")).toBe(false);
});

test("booking click tracks a Booking click event carrying the placement", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  // Booking links open a new tab — cancel that so the assertion stays in
  // this page; the site's bubble-phase listener still fires.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target as Element | null;
        if (el?.closest?.('a[href^="https://cal.com/"]')) e.preventDefault();
      },
      true,
    );
  });

  // The footer is the fixed basement — reveal it before clicking.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('footer a[href^="https://cal.com/"]').click();

  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Booking click", { placement: "footer" }]);
});

test("reaching a case study's closing door tracks a Study read event", async ({ page }) => {
  await page.goto("/work/law-firm/", { waitUntil: "load" });
  // Scroll the closing door itself into view — an instant jump to
  // scrollHeight can land with the section already above the viewport
  // (the fixed-basement footer fills the final screen on desktop), and an
  // IntersectionObserver never fires for a section the viewport skipped.
  await page.locator("[data-track-study-end]").scrollIntoViewIfNeeded();
  // The observer fires asynchronously after the scroll settles.
  await page.waitForFunction(() =>
    ((window as { __umamiCalls?: unknown[][] }).__umamiCalls ?? []).some(
      (ev) => ev[0] === "Study read",
    ),
  );
  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Study read", { study: "/work/law-firm/" }]);
  // Scrolling a study fires the read event exactly once.
  expect(calls.filter((ev) => ev[0] === "Study read")).toHaveLength(1);
});
