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
