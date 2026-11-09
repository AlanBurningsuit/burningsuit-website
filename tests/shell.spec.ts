import { test, expect, otherScripts, tracker } from "./analytics";
import { builtPages, expectIndexable, expectNoHorizontalScroll, watchPage } from "./helpers";
import { bespokeRoutes, pages, reserved404Routes } from "../src/config/compatibility.mjs";
import { formActionSource } from "../src/config/enquiry.mjs";
import { ANALYTICS } from "../src/config/analytics.mjs";

const formRoutes = bespokeRoutes.filter((route) => !["about", "privacy", "work"].includes(route));
const reserved = pages as Record<string, readonly string[]>;

// Every page the build emits (redirect stubs aside), found in dist/ rather than listed by hand.
for (const { route, indexed } of builtPages) {
  test(`static, ${indexed ? "indexable" : "noindex"}, CSP-clean page with the site shell: ${route}`, async ({ page }) => {
    const watch = await watchPage(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    // The shell: skip link to main, masthead with the main navigation, footer.
    await expect(page.locator('a.skip[href="#main"]')).toHaveText("Skip to content");
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.locator("header.masthead-band").getByRole("navigation", { name: "Main navigation" })).toHaveCount(1);
    await expect(page.locator("footer.footer-band")).toHaveCount(1);
    if (indexed) {
      // Case studies and essays add an Article node to the identity graph.
      await expectIndexable(page, { article: /^\/(work|writing|blog)\/./.test(route) });
    } else {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    }
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
    for (const directive of ["default-src 'none'", "script-src", "style-src", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
    // Every page carries the Umami tag, limited to the production domains; only /privacy/ adds its same-origin opt-out module.
    await expect(page.locator(tracker)).toHaveCount(1);
    await expect(page.locator(tracker)).toHaveAttribute("data-website-id", ANALYTICS.websiteId);
    await expect(page.locator(tracker)).toHaveAttribute("data-domains", ANALYTICS.domains);
    await expect(page.locator(otherScripts)).toHaveCount(route === "/privacy/" ? 1 : 0);
    if (route === "/privacy/") await expect(page.locator(otherScripts)).toHaveAttribute("src", /^\/_astro\/[^/]+\.js$/);
    // Reserved routes keep their anchors; of those, About, the free call page and the privacy notice link onward instead of carrying the form.
    const path = route.replace(/^\/|\/$/g, "");
    if (path in reserved) {
      await expect(page.locator("form")).toHaveCount(formRoutes.includes(path) ? 1 : 0);
      for (const id of reserved[path]) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
    watch.expectClean();
  });
}

test("every reserved route is a built page", () => {
  const built = new Set(builtPages.map(({ route }) => route.replace(/^\/|\/$/g, "")));
  expect(Object.keys(pages).filter((path) => !reserved404Routes.includes(path) && !built.has(path))).toEqual([]);
});

for (const path of reserved404Routes) {
  test(`reserved route remains a genuine 404: /${path}`, async ({ page }) => {
    expect((await page.goto(`/${path}/`))?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
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
  await page.getByRole("link", { name: "burningsuit home" }).click();
  await expect(page).toHaveURL(baseURL! + "/");
  await context.close();
});
for (const width of [320, 390, 768, 1280]) {
  test(`no overflow at ${width}px, including enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/404.html");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
