import { test, expect, otherScripts, tracker } from "./analytics";
import { builtPages, chunks, expectIndexable, expectNoHorizontalScroll, watchPage } from "./helpers";
import { bespokeRoutes, pages, reserved404Routes } from "../src/config/compatibility.mjs";
import { formActionSource } from "../src/config/enquiry.mjs";
import { ANALYTICS } from "../src/config/analytics.mjs";

const formRoutes = bespokeRoutes.filter((route) => !["about", "privacy", "work"].includes(route));
const reserved = pages as Record<string, readonly string[]>;

// Every page the build emits (redirect stubs aside), found in dist/ rather than listed by hand, batched across workers.
for (const [index, group] of chunks(builtPages, 4).entries()) {
  test(`static, CSP-clean pages with the site shell (group ${index + 1})`, async ({ page }) => {
    test.slow();
    const watch = await watchPage(page);
    for (const { route, indexed } of group) {
      watch.errors.length = 0;
      watch.external.length = 0;
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("h1"), route).toHaveCount(1);
      // The shell: skip link to main, masthead with the main navigation, footer.
      await expect(page.locator('a.skip[href="#main"]'), route).toHaveText("Skip to content");
      await expect(page.locator("main#main"), route).toHaveCount(1);
      await expect(page.locator("header.masthead-band").getByRole("navigation", { name: "Main navigation" }), route).toHaveCount(1);
      await expect(page.locator("footer.footer-band"), route).toHaveCount(1);
      if (indexed) {
        // Case studies and essays add an Article node to the identity graph.
        await expectIndexable(page, { article: /^\/(work|writing|blog)\/./.test(route) });
      } else {
        await expect(page.locator('meta[name="robots"]'), route).toHaveAttribute("content", /noindex/);
        await expect(page.locator('link[rel="canonical"]'), route).toHaveCount(0);
      }
      const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
      for (const directive of ["default-src 'none'", "script-src", "style-src", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp, route).toContain(directive);
      // Every page carries the Umami tag, limited to the production domains; only /privacy/ adds its same-origin opt-out module.
      await expect(page.locator(tracker), route).toHaveCount(1);
      await expect(page.locator(tracker), route).toHaveAttribute("data-website-id", ANALYTICS.websiteId);
      await expect(page.locator(tracker), route).toHaveAttribute("data-domains", ANALYTICS.domains);
      await expect(page.locator(otherScripts), route).toHaveCount(route === "/privacy/" ? 1 : 0);
      if (route === "/privacy/") await expect(page.locator(otherScripts)).toHaveAttribute("src", /^\/_astro\/[^/]+\.js$/);
      // Reserved routes keep their anchors; of those, About, the free call page and the privacy notice link onward instead of carrying the form.
      const path = route.replace(/^\/|\/$/g, "");
      if (path in reserved) {
        // Writing pages (the index, essays, articles and archive posts) end with the newsletter sign-up, their only form.
        await expect(page.locator("form"), route).toHaveCount(formRoutes.includes(path) || path === "writing" || path.startsWith("writing/") || path.startsWith("blog/") ? 1 : 0);
        for (const id of reserved[path]) await expect(page.locator(`[id="${id}"]`), `${route}#${id}`).toHaveCount(1);
      }
      expect(watch.errors, route).toEqual([]);
      expect(watch.external, route).toEqual([]);
    }
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
test("no overflow from 320px to 1280px, including enlarged text", async ({ page }) => {
  await page.goto("/404.html");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});
test("phone masthead: two rows of links, each at least 44px tall to tap", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const targets = nav.locator(".nav-training > a, .nav-menu summary, :scope > a");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoHorizontalScroll(page);
    const boxes = await targets.evaluateAll((els) => els.map((el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), height: b.height, size: parseFloat(getComputedStyle(el).fontSize) }; }));
    for (const { height } of boxes) expect(height, `${width}px`).toBeGreaterThanOrEqual(44);
    // Training, its chevron, Consultancy and Case studies share the first row; About and Contact the second.
    const rows = boxes.map(({ top }) => top);
    expect(new Set(rows.slice(0, 4)).size, `${width}px`).toBe(1);
    expect(new Set(rows.slice(4)).size, `${width}px`).toBe(1);
    expect(rows[4], `${width}px`).toBeGreaterThan(rows[0]);
    for (const { size } of [boxes[0], ...boxes.slice(2)]) expect(size, `${width}px`).toBeGreaterThanOrEqual(14.4);
  }
});
test("the Training menu closes on a click outside it, without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  const menu = page.locator(".nav-menu");
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(menu.getByRole("link").first()).toBeVisible();
  // A click inside the panel lands on its links, not on the dismiss layer beneath.
  expect(await page.evaluate(() => { const a = document.querySelector(".nav-menu ul a")!; const b = a.getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) === a; })).toBe(true);
  await page.mouse.click(200, 600);
  await expect(menu).not.toHaveAttribute("open", /.*/);
  await expect(page).toHaveURL(baseURL + "/");
  // The chevron itself still toggles it open and shut.
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await menu.locator("summary").click();
  await expect(menu).not.toHaveAttribute("open", /.*/);
  await context.close();
});
