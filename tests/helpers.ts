import { readdirSync, readFileSync } from "node:fs";
import type { Page, TestInfo } from "@playwright/test";
import { test, expect, isTracker } from "./analytics";

/**
 * Every HTML page the build emits, except legacy redirect stubs, as served paths ("/", "/about/", "/404.html").
 * Read from dist/ when the specs load, so a new page is covered without editing a list. Build first.
 */
export const builtPages: { route: string; indexed: boolean }[] = (() => {
  const dist = new URL("../dist/", import.meta.url);
  const files = readdirSync(dist, { recursive: true }).map((name) => String(name).replaceAll("\\", "/")).filter((name) => name.endsWith(".html")).sort();
  const pages = files.flatMap((file) => {
    const html = readFileSync(new URL(file, dist), "utf8");
    if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) return [];
    const indexed = !/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(html);
    return [{ route: "/" + file.replace(/(^|\/)index\.html$/, (_, slash: string) => slash), indexed }];
  });
  if (!pages.length) throw new Error("dist/ holds no pages: build first.");
  return pages;
})();

/**
 * Collects page errors, console errors (CSP violations included) and requests to any other origin than the test server
 * except the Umami tag. Call before the page loads; `expectClean()` asserts both lists are empty.
 */
export async function watchPage(page: Page, baseURL = test.info().project.use.baseURL!) {
  const errors: string[] = [];
  const external: string[] = [];
  const origin = new URL(baseURL).origin;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin && !isTracker(request.url())) external.push(request.url());
  });
  await reportCspViolations(page);
  return {
    errors, external,
    expectClean() {
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    },
  };
}

/** The bounding box of the element `selector` matches (strictly one). */
export const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
/** The bounding box of the first element `selector` matches. */
export const firstBox = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;

/** The page has no horizontal scroll. */
export async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

/** No element under `scope` spills its content past its own box sideways. */
export async function expectNoSpills(page: Page, scope = "main *") {
  const spills = await page.locator(scope).evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0).map((el) => el.className || el.tagName));
  expect(spills).toEqual([]);
}

/** Sets the root font size to each of `sizes` in turn, checks there is no horizontal scroll, then runs `check` at that size. */
export async function forEachTextSize(page: Page, check?: (size: string) => Promise<void>, sizes = ["100%", "200%"]) {
  for (const size of sizes) {
    await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, size);
    await expectNoHorizontalScroll(page);
    await check?.(size);
  }
}

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

/** Visual-review captures assert nothing, so routine runs leave them out; VISUAL_REVIEW=1 registers them. */
export const visualReviewEnabled = process.env.VISUAL_REVIEW === "1";

/** Registers the visual-review captures for a route (desktop and phone by default, or the given viewports), only under VISUAL_REVIEW=1. */
export function visualReview(route: string, viewports: readonly (readonly [number, number])[] = [[1366, 900], [390, 900]]) {
  if (!visualReviewEnabled) return;
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
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const path = new URL(page.url()).pathname;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(path, "https://burningsuit.co.uk").href);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new URL(path, "https://burningsuit.co.uk").href);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  const types = (JSON.parse(blocks[0])["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
  expect(types).toEqual(["Organization", "Person", "WebSite", ...(article ? ["Article"] : []), ...pageSchemaTypes(path)]);
}

/** The page-specific JSON-LD each route adds after the identity graph (and any Article), in emission order. */
export function pageSchemaTypes(path: string): string[] {
  const route = path.replace(/\/?$/, "/");
  const own: Record<string, string> = {
    "/about/": "ProfilePage",
    "/training/": "ItemList",
    "/power-bi/": "Service",
    "/training/power-bi-fundamentals/": "Course",
    "/training/power-bi-with-ai-agents-101/": "Course",
    "/training/dax-fundamentals/": "Course",
    "/training/dax-deep-dive/": "Course",
  };
  const nested = /^\/(training|work|privacy)\/[^/]+\/$/.test(route);
  return [...(own[route] ? [own[route]] : []), ...(nested ? ["BreadcrumbList"] : [])];
}

/**
 * The numbers the agenda's CSS counter draws before each step, worked out from the unmodified page's computed styles:
 * walking `.agenda` in document order, a `counter-reset: step` starts again from 0 and each step's `counter-increment`
 * adds to it. Each step must draw that counter as two digits with empty alt text (decorative, so screen readers skip it).
 */
export async function agendaNumbers(page: Page) {
  return page.locator(".agenda").evaluate((agenda) => {
    const numbers: string[] = [];
    let value = 0;
    for (const el of [agenda, ...agenda.querySelectorAll("*")]) {
      const style = getComputedStyle(el);
      const reset = style.counterReset.match(/\bstep(?:\s+(-?\d+))?/);
      if (reset) value = Number(reset[1] ?? 0);
      const increment = style.counterIncrement.match(/\bstep(?:\s+(-?\d+))?/);
      if (increment) value += Number(increment[1] ?? 1);
      if (el.matches(".agenda-steps > li")) {
        const before = getComputedStyle(el, "::before").content;
        numbers.push(/^counter\(step, decimal-leading-zero\) \/ ""$/.test(before) ? String(value).padStart(2, "0") : `not drawn: ${before}`);
      }
    }
    return numbers;
  });
}
