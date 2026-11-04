import { test, expect } from "@playwright/test";
import { pendingRoutes } from "../src/config/pending-routes.mjs";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";

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
    await expect(page.locator('script, astro-island, link[rel="canonical"], [data-rebuild-placeholder]')).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(route === "/" ? 1 : 0);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link")).toHaveText(["Training", "Consultancy", "About", "Contact"]);
    expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).textTransform)).toBe("none");
    expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain(`form-action ${formActionSource}`);
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
  await page.getByRole("article", { name: "Power BI with AI agents 101" }).getByRole("link", { name: "Read the course outline" }).click();
  await expect(page).toHaveURL(baseURL! + course);
  await expect(page.getByRole("heading", { name: "Power BI with AI agents 101", exact: true })).toBeVisible();
  await expect(page.locator(".to-confirm")).toHaveCount(4);
  await expect(page.locator('#contact a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();
  await context.close();
});

test("homepage keeps the approved sections, order and starting points", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  await expect(page.locator(".home-opening .eyebrow")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /how i train/i })).toHaveCount(0);
  await expect(page.locator("main img")).toHaveCount(1);
  await expect(page.locator("h1 .em")).toHaveText("isn't");
  await expect(page.locator(".introduction strong")).toHaveText("someone");
  const courses = page.getByRole("article");
  await expect(courses.getByRole("heading", { level: 3 })).toHaveText(["Power BI fundamentals", "Power BI with AI agents 101"]);
  for (const [name, ask] of [["Power BI fundamentals", "Ask about dates"], ["Power BI with AI agents 101", "Ask about a seat"]]) {
    const entry = page.getByRole("article", { name });
    await expect(entry.locator(".facts > li")).toHaveCount(4);
    await expect(entry.locator(".facts > li").last()).toHaveText("Price on request");
    await expect(entry.getByRole("link", { name: "Read the course outline" })).toHaveCount(1);
    await expect(entry.getByRole("link", { name: ask })).toHaveAttribute("href", "#contact");
  }
  await expect(page.locator('time[datetime="2027-01-20"]')).toHaveText("Wednesday 20 January 2027");
  await expect(page.locator(".specialist-names > li")).toHaveText(["DAX fundamentals (1 day)", "Data modelling (1 day)", "DAX deep dive (2 days)"]);
  await expect(page.locator(".specialist-names")).toBeVisible();
  // Separators are decorative: hidden from assistive technology and never left at a line start or end.
  await expect(page.locator(".specialist-names")).toMatchAriaSnapshot(`
    - list:
      - listitem: DAX fundamentals (1 day)
      - listitem: Data modelling (1 day)
      - listitem: DAX deep dive (2 days)
  `);
  const separators = () => page.locator(".specialist-names").evaluate((list) => {
    const edge = list.getBoundingClientRect().left;
    const clipped = getComputedStyle(list).overflow === "hidden";
    return [...list.children].map((item) => {
      const left = item.getBoundingClientRect().left;
      return { rowStart: Math.abs(left - edge) < 1, shown: !clipped || left + parseFloat(getComputedStyle(item, "::before").left) >= edge };
    });
  });
  for (const { rowStart, shown } of await separators()) expect(shown).toBe(!rowStart);
  await expect(page.getByRole("link", { name: "Compare all courses" })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("link", { name: /^Tell me what you use Power BI for now/ })).toHaveAttribute("href", "#contact");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Find your starting point", "Understanding that lasts", "Help with your own reporting", "Tell me what you're looking for."]);
  await expect(page.getByRole("link", { name: "Book a free hour on a call" })).toHaveAttribute("href", "https://cal.com/alan-burningsuit/hour");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
  await expect(page.locator(".proof, .exercise, blockquote")).toHaveCount(0);
  for (const id of ["training", "teaching", "consultancy", "contact"]) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);

  const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
  let intro = await box(".introduction"), list = await box(".courses"), photo = await box(".alan-photo");
  expect(list.x).toBeGreaterThanOrEqual(intro.x + intro.width);
  expect(list.y).toBeLessThan(intro.y + intro.height);
  expect(photo.x + photo.width).toBeLessThanOrEqual(list.x);
  const [fundamentals, agents] = [await box('article[aria-labelledby="fundamentals-title"]'), await box('article[aria-labelledby="agents-101-title"]')];
  expect(Math.abs(fundamentals.width - agents.width)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  intro = await box(".introduction"); list = await box(".courses"); photo = await box(".alan-photo");
  expect(list.y).toBeGreaterThanOrEqual(intro.y + intro.height);
  expect(photo.y).toBeGreaterThanOrEqual(list.y + list.height);
  for (const { rowStart, shown } of await separators()) expect(shown).toBe(!rowStart);
});

test("enquiry form is a labelled plain POST with nothing preselected that validates without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("link", { name: "Ask about a seat" }).click();
  await expect(page).toHaveURL(baseURL! + "/#contact");
  const form = page.getByRole("form", { name: "Tell me what you're looking for." });
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("method", "post");
  if (ENQUIRY.action) await expect(form).toHaveAttribute("action", ENQUIRY.action);
  else await expect(form).not.toHaveAttribute("action", /./);
  const topics = form.getByRole("group", { name: "What's it about?" }).getByRole("radio");
  await expect(topics).toHaveCount(ENQUIRY.topics.length);
  for (const [index, topic] of ENQUIRY.topics.entries()) {
    await expect(topics.nth(index)).toHaveAccessibleName(topic);
    await expect(topics.nth(index)).not.toBeChecked();
  }
  await expect(form.getByLabel("Organisation (optional)")).not.toHaveAttribute("required", "");
  await expect(form.getByLabel("Your message")).toHaveAccessibleDescription(/^Tell me as much or as little as you know/);
  const send = form.getByRole("button");
  await expect(send).toHaveText("Send");
  await expect(send).toHaveAttribute("type", "submit");
  // Without a delivery endpoint, Send is visibly unavailable rather than silently failing.
  if (ENQUIRY.action) await expect(send).toBeEnabled();
  else await expect(send).toBeDisabled();
  await expect(page.locator('#contact a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();

  // Browser validation marks an incomplete enquiry, then accepts one completed from the keyboard.
  await expect(form.locator(":invalid")).not.toHaveCount(0);
  await form.getByLabel("Name").fill("Test Person");
  await page.keyboard.press("Tab");
  await page.keyboard.type("test@example.com");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(topics.first()).toBeFocused();
  await page.keyboard.press("Space");
  await expect(topics.first()).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(form.getByLabel("Your message")).toBeFocused();
  await page.keyboard.type("A team of four.");
  await page.keyboard.press("Tab");
  if (ENQUIRY.action) await expect(send).toBeFocused();
  else await expect(page.locator(`#contact .fallback a[href="mailto:${ENQUIRY.email}"]`)).toBeFocused();
  await expect(form.locator(":invalid")).toHaveCount(0);
  await context.close();
});

for (const route of pendingRoutes) {
  test(`future sitemap destination remains explicitly unbuilt: ${route}`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
}
