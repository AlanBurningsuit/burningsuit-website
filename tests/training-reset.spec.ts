import { test, expect } from "@playwright/test";
import { pendingRoutes } from "../src/config/pending-routes.mjs";

const course = "/training/agentic-development-for-power-bi/";

for (const route of ["/", course]) {
  test(`built page stays static, private and CSP-clean: ${route}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL) external.push(request.url());
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
    });
    expect((await page.goto(route))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const loadedFonts = await page.evaluate(() => Array.from(document.fonts).filter((font) => font.status === "loaded").map((font) => font.family));
    for (const family of ["Mona Sans", "Albert Sans", "Commit Mono"]) expect(loadedFonts.some((font) => font.startsWith(family))).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('script, form, astro-island, link[rel="canonical"], [data-rebuild-placeholder]')).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link")).toHaveText(["Training", "Consultancy", "About", "Contact"]);
    expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).textTransform)).toBe("none");
    expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain("form-action 'none'");
    expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });

  for (const width of [320, 390, 768, 1366]) {
    test(`page reflows at ${width}px with enlarged text: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 768 });
      await page.goto(route);
      for (const size of ["100%", "200%"]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    });
  }

  for (const width of [1366, 390]) {
    test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = Array.from(document.images);
        for (const image of images) image.loading = "eager";
        await Promise.all(images.map((image) => image.decode()));
      });
      const capture = info.outputPath("page.png");
      await page.screenshot({ path: capture, fullPage: true });
      await info.attach("page", { path: capture, contentType: "image/png" });
    });
  }
}

test("the 101 keeps public and private enquiries distinct and open setup facts visible", async ({ page }) => {
  await page.goto(course);
  await expect(page.locator('nav a[aria-current]')).toHaveText("Training");
  await expect(page.locator('time[datetime="2027-01-20"]')).toHaveText("Wednesday 20 January 2027");
  await expect(page.locator(".course-facts")).toContainText("Price on request");
  await expect(page.getByRole("link", { name: "Ask about a seat" })).toHaveAttribute("href", "/contact/?about=101");
  await expect(page.getByRole("link", { name: "Ask about a private 101" })).toHaveAttribute("href", "/contact/?about=101-private");
  await expect(page.locator(".to-confirm")).toHaveCount(4);
  for (const tag of await page.locator(".to-confirm").all()) await expect(tag).toContainText("to confirm");
  await expect(page.getByRole("heading", { name: "If plans change" })).toHaveCount(0);
  await expect(page.locator(".outcomes > li")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  const intro = await page.locator(".course-intro").boundingBox();
  const facts = await page.locator(".public-run").boundingBox();
  const who = await page.locator(".course-who").boundingBox();
  expect(facts!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
  expect(who!.y).toBeGreaterThanOrEqual(facts!.y + facts!.height);
});

test("course discovery, facts and email fallback work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("link", { name: "Read the 101 outline" }).click();
  await expect(page).toHaveURL(baseURL! + course);
  await expect(page.getByRole("heading", { name: "Agentic development for Power BI 101", exact: true })).toBeVisible();
  await expect(page.locator(".to-confirm")).toHaveCount(4);
  await expect(page.locator('#contact a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();
  await context.close();
});

for (const route of pendingRoutes) {
  test(`future sitemap destination remains explicitly unbuilt: ${route}`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
}
