import { test, expect } from "@playwright/test";
import { bespokeRoutes, pages } from "../src/config/compatibility.mjs";
import { formActionSource } from "../src/config/enquiry.mjs";
import { ANALYTICS } from "../src/config/analytics.mjs";
import { isTracker, otherScripts, tracker } from "./analytics";

const formRoutes = bespokeRoutes.filter((route) => route !== "about" && route !== "hour" && route !== "privacy");

for (const [path, anchors] of Object.entries(pages)) {
  test(`static, noindex, CSP-clean compatibility shell: /${path}`, async ({ page }) => {
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const origin = new URL(test.info().project.use.baseURL!).origin;
    page.on("request", (request) => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin && !isTracker(request.url())) external.push(request.url()); });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
    });
    const response = await page.goto(`/${path}${path ? "/" : ""}`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
    for (const directive of ["default-src 'none'", "script-src", "style-src", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    // Every page carries the Umami tag, limited to the production domains; only /privacy/ adds its same-origin opt-out module.
    await expect(page.locator(tracker)).toHaveCount(1);
    await expect(page.locator(tracker)).toHaveAttribute("data-website-id", ANALYTICS.websiteId);
    await expect(page.locator(tracker)).toHaveAttribute("data-domains", ANALYTICS.domains);
    await expect(page.locator(otherScripts)).toHaveCount(path === "privacy" ? 1 : 0);
    if (path === "privacy") await expect(page.locator(otherScripts)).toHaveAttribute("src", /^\/_astro\/[^/]+\.js$/);
    // About, the free call page and the privacy notice link onward instead; the other registered bespoke routes carry the form, and placeholders have none.
    await expect(page.locator("form")).toHaveCount(formRoutes.includes(path) ? 1 : 0);
    for (const id of anchors) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}

test("legacy redirect resolves to the reserved consultancy anchor", async ({ page }) => {
  await page.goto("/ai-fit-for-teams/");
  await expect(page).toHaveURL(/\/power-bi\/#ai$/);
  await expect(page.locator("#ai")).toHaveCount(1);
});
test("keyboard skip link has a visible focus ring and reaches main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect(await skip.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
test("content and the error route work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const response = await page.goto("/missing-test-route/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "burningsuit", exact: true }).click();
  await expect(page).toHaveURL(baseURL! + "/");
  await context.close();
});
for (const width of [320, 390, 768, 1280]) {
  test(`no overflow at ${width}px, including enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/404.html");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
