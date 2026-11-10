import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, box, forEachTextSize, watchPage } from "./helpers";

const route = "/work/individual-power-bi-coaching/";
// /training/#coaching is approved copy; the Training page's coaching entry lands on a separate branch, so only the href is checked here.
const links = ["/training/#coaching", "/contact/"];

test("Individual coaching study stays static, private and CSP-clean, with no form or third-party request", async ({ page, baseURL }) => {
  const watch = await watchPage(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Individual Power BI coaching | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Coaching for someone already building Power BI reports: modelling and DAX on example data shaped around his reporting, with homework between sessions.");
  await expectIndexable(page, { article: true });
  await expect(page.locator('meta[http-equiv="Content-Security-Policy" i]')).toHaveAttribute("content", /default-src 'none'/);
  await expect(page.locator(`${otherScripts}, astro-island, iframe, form, input, button, main img, main picture, [style]`)).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  watch.expectClean();
});

test("Individual coaching study keeps the approved wording and heading hierarchy", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to entry and test together.
  await expect(page.locator(".eyebrow")).toHaveCount(0);
  await expect(page.locator("h1")).toHaveText("Power BI coaching for someone already building reports");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Where he started", "How the coaching ran", "The rule I got wrong", "What he kept, and what changed",
    "Thinking about coaching for one person, or a few?",
  ]);
  await expect(page.locator("h3, h4")).toHaveCount(0);
  await expect(page.locator(".case-facts dt")).toHaveText(["Format", "Who", "Length", "Material"]);
  await expect(page.locator(".case-facts dd")).toHaveText([
    "Power BI coaching, one learner",
    "Someone already building Power BI reports",
    "Eight weekly sessions, plus a recap",
    "Example data shaped around his reporting, with homework between sessions; his live model in the final session",
  ]);
  await expect(page.locator("main p")).toHaveText([
    "He was already building Power BI reports from several sources. A course that started at the beginning would have spent most of its time on things he could already do. So over eight weekly sessions and a recap, we worked on the parts underneath: the data model, DAX (Power BI's calculation language) and checking the numbers.",
    "He wasn't starting from zero. He was already building reports from several data sources, shaping data in Power Query, writing measures and thinking about how people would find their way around the finished report.",
    "He had a good eye for how a report looks and reads. The gap was underneath: a model that would hold up as more data arrived, DAX he could write and explain, and the habit of checking a number before anyone else sees it. A polished report with a wrong number in it is more dangerous than a scruffy one, because it looks right.",
    "A course teaches a group from prepared teaching files. Here I wrote the syllabus for one person, around the reporting he was being asked to produce. The first session didn't start in Power BI's menus. It asked what his report was for, and how we would know its numbers were right.",
    "From there the sessions followed the path a real report build follows: the questions, the data model, shaping the data into it, DAX, then getting the finished reports in front of the right people.",
    "Most of the teaching ran on example data I built to look like his reporting. That let us work on his kind of problem without his data being the starting point. In the final session we spent time on his live model, because by then that was the most useful thing on the table.",
    "Each week, a session introduced an idea and built it on the example model. Each came with written notes to revise from. Most weeks, homework then asked him to use the idea himself before the next session, and I reviewed what he sent back. The homework is where the best teaching moment came from.",
    "One week's homework included a rule I had taught: a true-or-false test inside CALCULATE (the DAX function that changes which rows a measure looks at) can only refer to one column. He wrote a measure that tested two columns in one argument. DAX accepted it, and he was suspicious of it.",
    "On the day, I couldn't tell him why. I said I had probably written the example badly. Afterwards I tested it properly, and the rule was wrong. The limit is one table, not one column. The error message even says so: it names tables, not columns. I should have read it more carefully years ago.",
    "The correction opened that session's notes, with the tests behind it. He was right, and I told him so.",
    "What I taught: A true-or-false filter argument in CALCULATE can only refer to one column.",
    "What's true: It can refer to any number of columns, as long as they all come from one table. The second example below is refused because its test refers to columns from two tables.",
    "The refusal reads: \"only columns from a single table can be used in a True/False expression that is used as a table filter expression.\" A test that genuinely reaches across two tables is where FILTER comes in.",
    "At the end I sent him the reusable models, the sample data they run on, and the notes from every session, so the examples still work without me.",
    "In the final session he showed me his live model and named a problem in it himself: for each new calculation he had been building a new table, where a better-shaped model would let a measure do the work. When I asked what had changed most, he said modelling and DAX. That's probably not what he'd have picked at the start, and I think that's where the value is.",
    "This is my account of the coaching, with what he told me in the final session. It doesn't show what changed in his work afterwards.",
    "Power BI coaching is for one to three people from one organisation, ideally one team. The offer is a two-hour session each week, online, or on site where it suits, with homework, for 4 to 8 weeks, to a syllabus written for you, on your own data or example data built to look like it. The eight sessions and recap above were this engagement's shape, not a fixed length. Price on request.",
    "Tell me who it's for and what they're building",
  ]);
  await expect(page.locator(".case-teaching pre code")).toHaveText([
    "-- Accepted: two columns, one table", "Large online orders =", "CALCULATE (", "    [Orders],",
    "    Sales[Channel] = \"Online\" && Sales[Amount] > 1000", ")", "",
    "-- Refused: the test reaches across two tables", "Large northern orders =", "CALCULATE (", "    [Orders],",
    "    Sales[Amount] > 1000 && Customer[Region] = \"North\"", ")", "",
  ].join("\n"));
  // Every section is labelled by its own heading.
  for (const section of await page.locator("main section").all()) {
    const id = await section.getAttribute("aria-labelledby");
    await expect(section.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator("main figure, main blockquote, main img")).toHaveCount(0);
  const text = await page.locator("main").innerText();
  for (const absent of [/\[Visitor|Visitor question/i, /—/, /[‘’“”]/, /£/]) expect(text).not.toMatch(absent);
});

test("Individual coaching study returns to Training's coaching entry and the Contact page only", async ({ page }) => {
  await page.goto(route);
  for (const [name, href] of [
    ["See how coaching fits with the courses", "/training/#coaching"],
    ["Tell me who it's for and what they're building", "/contact/"],
  ]) await expect(page.locator("main").getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  expect(await page.locator("main a").evaluateAll((all) => all.map((link) => link.getAttribute("href")))).toEqual(links);
  expect(await page.locator("main a").evaluateAll((all) => all.some((link) => /\/(hour|call)\/|#contact$/.test(link.getAttribute("href") ?? "")))).toBe(false);
});

test("Individual coaching study works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".case-teaching pre")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  // The code block wraps instead of scrolling, so it is not a tab stop; the two return links follow.
  const reached: string[] = [];
  for (let i = 0; i < links.length; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => { const el = document.activeElement!; return el.getAttribute("href") ?? el.tagName.toLowerCase(); }));
    const ring = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { width: parseFloat(s.outlineWidth), visible: r.width > 0 && r.height > 0 }; });
    expect(ring.width).toBeGreaterThanOrEqual(3);
    expect(ring.visible).toBe(true);
  }
  expect(reached).toEqual(links);
  expect(await page.locator(".case-teaching pre").getAttribute("tabindex")).toBeNull();
  await context.close();
});

test("Individual coaching study layout: facts beside the lead, teaching on a raised surface, phones stack", async ({ page }) => {
  const style = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  const [lead, facts] = [await box(page, ".case-lead"), await box(page, ".case-facts")];
  expect(facts.x).toBeGreaterThanOrEqual(lead.x + lead.width);
  for (const id of ["started-title", "rule-title"]) {
    const [h, p] = [await box(page, `#${id}`), await box(page, `[aria-labelledby="${id}"] .case-prose`)];
    expect(p.x).toBeGreaterThanOrEqual(h.x + h.width);
  }
  expect(await style(".case-teaching", "background-color")).not.toBe(await style("body", "background-color"));
  expect(await style(".case-teaching", "background-color")).not.toBe("rgb(241, 236, 217)"); // never the cream evidence surface
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const [leadPhone, factsPhone] = [await box(page, ".case-lead"), await box(page, ".case-facts")];
    expect(factsPhone.y).toBeGreaterThanOrEqual(leadPhone.y + leadPhone.height);
    const [h, p] = [await box(page, "#rule-title"), await box(page, '[aria-labelledby="rule-title"] .case-prose')];
    expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    for (const item of await page.locator("main a, main h1, main h2, main p, main dl, main pre").all()) {
      const b = (await item.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`Individual coaching study reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await forEachTextSize(page, async () => {
      expect(await page.locator(".case-teaching pre").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "Tell me who it's for and what they're building" })).toBeVisible();
    });
  });
}

visualReview(route);
