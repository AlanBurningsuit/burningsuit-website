import type { Page, TestInfo } from "@playwright/test";
import { test } from "./analytics";

/** Reports any Content Security Policy violation as a console error, which the static-page checks collect and expect to be empty. */
export async function reportCspViolations(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
  });
}

/** A full-page review capture with every image loaded and decoded and the fonts ready, attached to the test report. */
export async function capturePage(page: Page, info: TestInfo) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    for (const image of images) image.loading = "eager";
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    window.scrollTo(0, 0);
  });
  const capture = info.outputPath("page.png");
  await page.screenshot({ path: capture, fullPage: true });
  await info.attach("page", { path: capture, contentType: "image/png" });
}

/** Registers the visual-review captures for a route: desktop and phone by default, or the given viewports. */
export function visualReview(route: string, viewports: readonly (readonly [number, number])[] = [[1366, 900], [390, 900]]) {
  for (const [width, height] of viewports) {
    test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await page.goto(route);
      await capturePage(page, info);
    });
  }
}

/** An indexed page: no robots exclusion, a canonical link to its own production URL and the identity graph as JSON-LD. */
export async function expectIndexable(page: Page, { article = false } = {}) {
  const { expect } = await import("@playwright/test");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const path = new URL(page.url()).pathname;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(path, "https://burningsuit.co.uk").href);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new URL(path, "https://burningsuit.co.uk").href);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  const types = (JSON.parse(blocks[0])["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
  expect(types).toEqual(["Organization", "Person", "WebSite", ...(article ? ["Article"] : [])]);
}
