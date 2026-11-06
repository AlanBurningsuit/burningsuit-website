import { readFileSync } from "node:fs";
import { test as base, expect, type BrowserContext } from "@playwright/test";
import { ANALYTICS } from "../src/config/analytics.mjs";

// The site-wide Umami tag is the only permitted third-party script and request; it reports only from the production domains, never from test hosts.
export const tracker = `script[src="${ANALYTICS.scriptSrc}"]`;
// JSON-LD is inert data, not a script that runs, so it is not counted.
export const otherScripts = `script:not([src="${ANALYTICS.scriptSrc}"]):not([type="application/ld+json"])`;
export const isTracker = (url: string) => url === ANALYTICS.scriptSrc;

// Routine runs serve the committed copy of the tag and never contact Umami. UMAMI_LIVE=1 fetches the real tag instead (still never a beacon).
export const liveTracker = process.env.UMAMI_LIVE === "1";
const localTracker = readFileSync(new URL("./fixtures/umami/script.js", import.meta.url));
const umami = /^https?:\/\/([a-z0-9-]+\.)*umami\.is(\/|$)/;

// Umami URLs a guard had to stop during the current test (one test runs at a time per worker).
const escaped: string[] = [];

/** Serves the tag locally and aborts any other umami.is request, recording it. Routes added later (a test's own beacon stub) take precedence. */
async function guardUmami(context: BrowserContext) {
  await context.route(umami, (route) => {
    const url = route.request().url();
    if (isTracker(url)) return liveTracker ? route.continue() : route.fulfill({ status: 200, contentType: "application/javascript", body: localTracker });
    escaped.push(url);
    return route.abort("blockedbyclient");
  });
}

// Every spec uses this test. The page context and any context a test opens itself are guarded, and a test fails if an Umami request other than the tag gets past its own stubs.
export const test = base.extend<{ umamiGuard: void }, { guardNewContexts: void }>({
  guardNewContexts: [async ({ browser }, use) => {
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (options) => {
      const context = await newContext(options);
      await guardUmami(context);
      return context;
    };
    await use();
  }, { scope: "worker", auto: true }],
  umamiGuard: [async ({ context }, use) => {
    escaped.length = 0;
    await guardUmami(context);
    await use();
    expect(escaped, "Umami requests must never leave a test").toEqual([]);
  }, { auto: true }],
});
export { expect };
