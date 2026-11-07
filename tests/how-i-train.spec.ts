import { test, expect, isTracker, otherScripts } from "./analytics";
import { reportCspViolations, visualReview, expectIndexable } from "./helpers";
import { ENQUIRY } from "../src/config/enquiry.mjs";
import { pendingRoutes } from "../src/config/pending-routes.mjs";

const route = "/training/how-i-train/";
const email = `mailto:${ENQUIRY.email}`;
// The enquiry link targets the Contact page. That page is built on its own branch; until it is
// integrated, /contact/ here is still the legacy redirect, so only the href itself is checked.
const links = ["/training/#coaching", "/power-bi/", "/work/contact-centre/", "/work/individual-power-bi-coaching/", "/power-bi/", "/training/agentic-development-for-power-bi/#need-title", "/training/", "/training/power-bi-fundamentals/", "/training/agentic-development-for-power-bi/", email, "/contact/", "/about/", "/work/"];

test("How I train stays static, private and CSP-clean, with no form or third-party request", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL && !isTracker(request.url())) external.push(request.url());
  });
  await reportCspViolations(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("How I train | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "How I teach Power BI: practice on prepared examples, questions about your own work, help when you get stuck, and reasons behind recommendations.");
  await expectIndexable(page);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy" i]')).toHaveAttribute("content", /default-src 'none'/);
  await expect(page.locator(`${otherScripts}, astro-island, iframe, [data-rebuild-placeholder], form, input, button, main img, main picture`)).toHaveCount(0);
  await expect(page.locator('nav a[aria-current="true"]')).toHaveText("Training");
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  expect(pendingRoutes).not.toContain(route);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("How I train keeps the approved wording and heading hierarchy", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to page and test together.
  await expect(page.locator("h1")).toHaveText("How I train");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you'll do", "If you get stuck", "Questions about your own work", "Helping you use it afterwards", "On every course", "Where next"]);
  // One subheading: the private course terms under "On every course" (approved amendment, 7 Nov).
  await expect(page.locator("h3")).toHaveText(["Private course terms"]);
  await expect(page.locator("h4")).toHaveCount(0);
  await expect(page.locator("main p:not(.study-evidence-label)")).toHaveText([
    "My courses are about understanding how Power BI works and putting it to use.",
    "Mostly, I explain and show you how something works, then you do it yourself on examples I've prepared for teaching. I want you to ask questions as we go. My aim is to make clear what each part is for before we get into how it works.",
    "I've made almost every mistake in Power BI worth making. If something isn't making sense, say so. I'll help you work out where it went wrong and build back up from there. I keep groups small so there's time to work through questions and help everyone follow what's happening.",
    "Yes. Ask how an idea applies where you work, and I'll follow the question within what the course covers. If you'd like to learn on your own work over several weeks, that's what Power BI coaching is for. If there's something specific you'd like to get working with your own data, we can work together.",
    "I aim for explanations you can use again. When I recommend a way of doing something, I tell you what it helps with and when it matters, so you can make your own choice when a similar problem turns up. I also name things as we meet them, because knowing what something's called helps you ask better questions.",
    "I write and teach every course myself, for groups of up to 8 people.",
    "These terms apply to Power BI fundamentals, DAX fundamentals, Data modelling and the DAX deep dive.",
    "Power BI with AI agents 101 is set up differently: see what you'll need for the 101.",
    "Compare all the courses, or start with Power BI fundamentals or Power BI with AI agents 101. If you've got a question about how I teach, email me or use the enquiry form. There's more about me too.",
  ]);
  // Every section is labelled by its own heading; nothing else is visible copy.
  for (const section of await page.locator("main section").all()) {
    const id = await section.getAttribute("aria-labelledby");
    await expect(section.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator("main figure, main blockquote, main dl")).toHaveCount(0);
  // The only list outside the study links is the private course terms, a ruled list that #private-courses lands on.
  await expect(page.locator("main li:not(.study-links li)")).toHaveText([
    "Dates: I'll arrange dates with you after you get in touch.",
    "On site: you use my training laptops. I provide the course materials and manage the Power BI Desktop version.",
    "Online: use your own computer with a version of Power BI Desktop released in the 3 months before the course. I provide the course materials.",
    "To take away: on site, the course materials. Online, the course materials and a recording of the session.",
    "Your own data: the courses use examples I've prepared for teaching. For help with your own reports, we can work together.",
  ]);
  await expect(page.locator("#private-courses")).toHaveText("Private course terms");
  expect(await page.locator("#private-courses").evaluate((el) => el.closest("section")?.getAttribute("aria-labelledby"))).toBe("facts-title");
  const text = await page.locator("main").innerText();
  for (const absent of [/\[|\]/, /—/, /price/i, /book/i, /organisation/i]) expect(text).not.toMatch(absent);
});

test("How I train links: coaching, consultancy, the courses, email, the Contact page and About", async ({ page }) => {
  await page.goto(route);
  for (const [name, href] of [
    ["Power BI coaching", "/training/#coaching"],
    ["we can work together", "/power-bi/"],
    ["all the courses", "/training/"],
    ["Power BI fundamentals", "/training/power-bi-fundamentals/"],
    ["Power BI with AI agents 101", "/training/agentic-development-for-power-bi/"],
    ["email me", email],
    ["the enquiry form", "/contact/"],
    ["about me", "/about/"],
    ["what you'll need for the 101", "/training/agentic-development-for-power-bi/#need-title"],
  ]) for (const link of await page.locator("main").getByRole("link", { name, exact: true }).all()) await expect(link).toHaveAttribute("href", href);
  // "we can work together" appears twice, in the own-work answer and the private course terms; both lead to consultancy.
  await expect(page.locator("main").getByRole("link", { name: "we can work together", exact: true })).toHaveCount(2);
  expect(await page.locator("main a").evaluateAll((all) => all.map((link) => link.getAttribute("href")))).toEqual(links);
  expect(await page.locator("main a").evaluateAll((all) => all.some((link) => /#contact/.test(link.getAttribute("href") ?? "")))).toBe(false);
});

test("How I train works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.locator("h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < links.length; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
    const ring = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { width: parseFloat(s.outlineWidth), visible: r.width > 0 && r.height > 0 }; });
    expect(ring.width).toBeGreaterThanOrEqual(3);
    expect(ring.visible).toBe(true);
  }
  expect(reached).toEqual(links);
  await context.close();
});

test("How I train layout: the stuck answer stands out, the facts note recedes, phones stack", async ({ page }) => {
  const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
  const style = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  for (const id of ["do-title", "stuck-title"]) {
    const [h, p] = [await box(`#${id}`), await box(`[aria-labelledby="${id}"] .hit-prose`)];
    expect(p.x).toBeGreaterThanOrEqual(h.x + h.width);
  }
  // The two related answers sit side by side; neither reads as the next step of the other.
  const [own, after] = [await box('[aria-labelledby="own-work-title"]'), await box('[aria-labelledby="afterwards-title"]')];
  expect(after.x).toBeGreaterThanOrEqual(own.x + own.width);
  expect(Math.abs(after.y - own.y)).toBeLessThan(2);
  // The personal answer sits on the raised band with larger prose; the facts note is smaller than the answers.
  expect(await style(".hit-stuck", "background-color")).not.toBe(await style("body", "background-color"));
  const size = async (selector: string) => parseFloat(await style(selector, "font-size"));
  expect(await size(".hit-stuck p")).toBeGreaterThan(await size(".hit-do p"));
  expect(await size(".hit-facts-note")).toBeLessThan(await size(".hit-do p"));
  expect(await size("#facts-title")).toBeLessThan(await size("#do-title"));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ["do-title", "stuck-title"]) {
      const [h, p] = [await box(`#${id}`), await box(`[aria-labelledby="${id}"] .hit-prose`)];
      expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    }
    const [ownPhone, afterPhone] = [await box('[aria-labelledby="own-work-title"]'), await box('[aria-labelledby="afterwards-title"]')];
    expect(afterPhone.y).toBeGreaterThanOrEqual(ownPhone.y + ownPhone.height);
    for (const item of await page.locator("main a, main h1, main h2, main p").all()) {
      const b = (await item.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`How I train reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "the enquiry form" })).toBeVisible();
    }
  });
}

visualReview(route);
