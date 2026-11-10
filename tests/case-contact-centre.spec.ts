import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, box, forEachTextSize, watchPage } from "./helpers";

const route = "/work/contact-centre/";
const links = ["/training/#coaching", "/contact/"];

test("The contact-centre study stays static, private and CSP-clean, with no form, image or third-party request", async ({ page, baseURL }) => {
  const watch = await watchPage(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Coaching a contact-centre team lead | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A contact-centre team lead could follow Power BI tutorials but got stuck on her own data. Coaching on her reporting helped her do more of it herself.");
  await expectIndexable(page, { article: true });
  await expect(page.locator('meta[http-equiv="Content-Security-Policy" i]')).toHaveAttribute("content", /default-src 'none'/);
  await expect(page.locator(`${otherScripts}, astro-island, iframe, form, input, button, main img, main picture, main svg, main figure, main blockquote`)).toHaveCount(0);
  // The study sits outside the navigation's sections.
  // A study marks Work as its section, not as the current page.
  await expect(page.locator('nav a[aria-current="true"]')).toHaveText("Case studies");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  watch.expectClean();
});

test("The contact-centre study keeps the approved wording and heading hierarchy", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to the entry and test together.
  await expect(page.locator("h1")).toHaveText("Power BI coaching for a contact-centre team lead");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Where she started", "What she wanted", "What we worked on", "Where she'd got to by January 2026", "Stuck on your own data?"]);
  await expect(page.locator("h3, h4")).toHaveCount(0);
  await expect(page.locator("main dt")).toHaveText(["Format", "Who", "Length", "Material"]);
  await expect(page.locator("main dd")).toHaveText(["Power BI coaching", "A contact-centre team lead", "Several weeks", "Her own reporting and data"]);
  await expect(page.locator("main p")).toHaveText([
    "She could follow Power BI tutorials on the data they came with. On her own data, she got stuck. She wanted to do the work herself, so that's what we worked on.",
    "She'd worked through self-study Power BI examples and could follow them on the data provided. When she switched to her own data, things stopped working and she couldn't see why.",
    "Colleagues who knew Power BI well would fix things for her, and the report would work again. But she didn't understand what they'd changed.",
    "She didn't want a report built for her. It was her data and part of her job, and she wanted to be the person who could do it. So I said at the start that the point of our work was her skills, not the report.",
    "We worked on her reporting questions, over several weeks. She did the work in Power BI and I explained why it behaved the way it did. We covered how the relationships between her tables carried a filter from one table to another, and what happened to the numbers on a visual when she filtered to a single person. We also covered what Power BI does when it squeezes a column of numbers into a single value.",
    "Because it was her own work, each explanation was about a problem she actually had, not one I'd prepared for her.",
    "When we spoke in January 2026, she told me she'd been opening Power BI almost every day, and she talked me through changes she'd made to her report.",
    "She'd also brought the problems she was stuck on. One was counting the blank entries in a column for each person and team. Another was blank values that had quietly disappeared when she'd reshaped her data in an earlier step. We worked through both in the session. She was doing more on her own, and coaching still helped with the problems she brought.",
    "This is my account of the coaching, with what she told me in January 2026. It doesn't measure what changed in her work.",
    "If you, or someone on your team, can follow the examples but get stuck on your own data, coaching is built for that. The format, the length and who it's for are on the Training page.",
    /^\s*Or tell me what you're working on\s+Mention coaching in your message\.\s*$/,
  ]);
  // The index-only fields stay off the study page.
  const text = await page.locator("main").innerText();
  expect(text).not.toContain("A team lead who got stuck on her own data was doing more of her reporting herself, with coaching.");
  // Straight quotes as approved; no dashes, brackets, prices, quotes or terms the copy leaves to Training.
  for (const absent of [/[‘’“”]/, /[—–]/, /\[|\]/, /price/i, /book/i, /dashboard/i, /up to \d/i, /"/]) expect(text).not.toMatch(absent);
});

test("The contact-centre study links to Training's coaching entry and the Contact page, never the free call", async ({ page }) => {
  await page.goto(route);
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: "See Power BI coaching", exact: true })).toHaveAttribute("href", "/training/#coaching");
  const contact = main.getByRole("link", { name: "Or tell me what you're working on", exact: true });
  await expect(contact).toHaveAttribute("href", "/contact/");
  await expect(contact).toHaveAccessibleDescription("Mention coaching in your message.");
  expect(await main.locator("a").evaluateAll((all) => all.map((link) => link.getAttribute("href")))).toEqual(links);
  expect(await page.locator("a").evaluateAll((all) => all.some((link) => /\/(hour|call)\/?|#contact|calendly|mailto:/i.test(link.getAttribute("href") ?? "") && !!link.closest("main")))).toBe(false);
  expect(await page.content()).not.toMatch(/href="\/(hour|call)\//);
  // Training is a built page; its coaching anchor arrives separately, so only the page itself is required here.
  expect((await page.request.get("/training/"))?.status()).toBe(200);
});

test("The shared index is built and reserved studies remain 404s", async ({ page }) => {
  expect((await page.goto("/work/"))?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Case studies");
  for (const path of ["/work/law-firm/", "/work/museum/"]) {
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
  }
});

test("The contact-centre study works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".case-facts")).toBeVisible();
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

test("The contact-centre study layout: headings beside their prose on wide screens, the facts quieter, phones stack", async ({ page }) => {
  const size = async (selector: string) => parseFloat(await page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontSize));
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  for (const id of ["started", "worked"]) {
    const [h, p] = [await box(page, `#${id}-title`), await box(page, `[aria-labelledby="${id}-title"] .case-prose`)];
    expect(p.x).toBeGreaterThanOrEqual(h.x + h.width);
    expect(Math.abs(p.y - h.y)).toBeLessThan(2);
  }
  // The four facts sit beside the lead, smaller than it.
  const [lead, facts] = [await box(page, ".case-lead"), await box(page, ".case-facts")];
  expect(facts.x).toBeGreaterThanOrEqual(lead.x + lead.width);
  expect(await size(".case-facts dd")).toBeLessThan(await size(".case-lead"));
  expect(await page.locator(".case-closing").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ["started", "worked"]) {
      const [h, p] = [await box(page, `#${id}-title`), await box(page, `[aria-labelledby="${id}-title"] .case-prose`)];
      expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    }
    // On phones the facts follow the lead, one per row.
    const leadPhone = await box(page, ".case-lead");
    const [first, second] = [await box(page, ".case-facts > div:nth-child(1)"), await box(page, ".case-facts > div:nth-child(2)")];
    expect(first.y).toBeGreaterThanOrEqual(leadPhone.y + leadPhone.height);
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
    for (const item of await page.locator("main a, main h1, main h2, main p, main dt, main dd").all()) {
      const b = (await item.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`The contact-centre study reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await forEachTextSize(page, async () => {
      await expect(page.getByRole("link", { name: "See Power BI coaching" })).toBeVisible();
    });
  });
}

visualReview(route);
