import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, firstBox, forEachTextSize, watchPage } from "./helpers";
import { pages } from "../src/config/compatibility.mjs";

const route = "/work/carbon-footprint/";

test("carbon-footprint study stays static, private and CSP-clean, with no form, image or script", async ({ page, baseURL }) => {
  const watch = await watchPage(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Carbon reporting in a model the team can check | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "How I worked with a UK university's sustainability team: their carbon reporting method built into one model, checked against their totals, then handed over.");
  await expectIndexable(page, { article: true });
  // The superseded social card is not used; the page keeps the site-wide card.
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://burningsuit.co.uk/og-image.png");
  await expect(page.locator(`${otherScripts}, astro-island, form, iframe, embed, object, main img`)).toHaveCount(0);
  expect(pages["work/carbon-footprint"]).toEqual([]);
  // A study marks Work as its section, not as the current page.
  await expect(page.locator('nav a[aria-current="true"]')).toHaveText("Case studies");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(0);
  watch.expectClean();
});

test("carbon-footprint study reads in the approved words and order", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator(".eyebrow")).toHaveCount(0);
  await expect(page.locator("h1")).toHaveText("Carbon reporting for a UK university's sustainability team");
  await expect(page.locator("h1 .em")).toHaveText("Carbon reporting");
await expect(page.locator(".case-lead")).toHaveText("A UK university's sustainability team had the method behind their carbon reporting, and the corrections it needed, spread across spreadsheets. I built one model that does the sums their way and keeps its workings. We checked it together against their own totals, and I handed it over with the steps practised and written down.");
  await expect(page.locator(".case-facts dt")).toHaveText(["Format", "Who", "Length", "Material"]);
  await expect(page.locator(".case-facts dd")).toHaveText(["Power BI consultancy", "A UK university's sustainability team", "Three months", "Their own carbon reporting method and totals"]);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Where they started", "Workings you can follow", "Checking it together", "Handing it over", "Does your reporting live in spreadsheets?"]);
  for (const [id, heading] of [["started", "Where they started"], ["workings", "Workings you can follow"], ["checking", "Checking it together"], ["handover", "Handing it over"]]) {
    await expect(page.locator(`section[aria-labelledby="${id}-title"] > h2#${id}-title`)).toHaveText(heading);
  }
  await expect(page.locator(".case-prose p")).toHaveText([
    "The team's method, and the corrections it relied on, were spread across several spreadsheets. Each report drew on that method, so a dashboard on its own would have left the method exactly where it was.",
    "The useful thing to build was one model that holds the method in one place, with several reports drawing on it. That's what I built.",
    "I didn't bring a method of my own. I took the one the team already used and wrote it into the model step by step.",
    "The model keeps its intermediate workings, so the team can see how a figure was reached as well as the total. Each year is worked out with that year's own factors (the numbers that turn spending and travel into carbon). And the model keeps the team's manual overrides, so the corrections they make by hand still count.",
    "The people who know a method best are the ones who can tell when a model has it wrong, so we checked it together.",
    "We compared the model's totals with the team's source totals. When one figure differed, I paused changes to the model while the team checked their side.",
    "Later, during handover, the team spotted that the model was using calendar years where the university works in academic years. I fixed it before the next session.",
    "Handover meant the team practising the steps themselves: refreshing the data and building reports from the model.",
    "They also have documentation of how the model is designed, how the calculations work and what it needs each year to stay up to date.",
  ]);
  await expect(page.locator(".case-limits")).toHaveText("This shows how the work ran and what I handed over. It doesn't show how the team has used the model since.");
  await expect(page.locator(".case-closing .raised-copy > p").first()).toHaveText("Bring reporting like this to a free 30-minute call. We'll look at what would be useful to build, and I'll tell you if it isn't something I can help with.");
  // The paragraph that recapped the four sections is gone.
  await expect(page.locator("main")).not.toContainText("this is how I'd work on it with you");
  // Straight quotes and hyphens exactly as approved: no typographic substitution.
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/[‘’“”–—]/);
});

test("carbon-footprint study returns to consultancy and the free call as real links", async ({ page }) => {
  await page.goto(route);
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => [link.textContent, link.getAttribute("href")]));
  expect(mainLinks).toEqual([["Book a free 30-minute call", "/call/"], ["More about Power BI consultancy", "/power-bi/"]]);
  await expect(page.locator(".case-closing .text-link")).toHaveAttribute("href", "/call/");
  for (const link of await page.locator("main a").all()) await expect(link).not.toHaveAttribute("target", /./);
});

test("carbon-footprint study carries none of the superseded entry's uncleared claims", async ({ page }) => {
  await page.goto(route);
  const html = await page.content();
  const text = (await page.locator("main").innerText()) + " " + (await page.title()) + " " + (await page.locator('meta[name="description"]').getAttribute("content"));
  for (const absent of [
    /half a day/i, /eight days/i, /\bdays?\b/i, /scope 3/i, /prototype/i, /student/i, /laptop/i, /\bhis\b|\bhim\b|\bhe\b/i,
    /one person/i, /time sav|saved|faster|reduc/i, /come back|follow-on|next piece/i, /refresh(es)? (it|the model) (on|by) (his|their) own/i,
    /faculty|faculties/i, /supply-chain|cabin class|waste and water/i, /annual refresh takes/i, /Fabric|Excel/, /[£$€]\s*\d/, /\[|\]/,
  ]) expect(text, `unexpected ${absent}`).not.toMatch(absent);
  expect(html).not.toContain("linkedin-work-carbon-footprint");
});

test("carbon-footprint study works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
  }
  expect(reached).toEqual(["/call/", "/power-bi/"]);
  for (const [name, title] of [["More about Power BI consultancy", "Power BI consultancy that leaves your team independent"], ["Book a free 30-minute call", "A free 30-minute call about your Power BI"]]) {
    await page.goto(route);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.locator("h1")).toHaveText(title);
  }
  await context.close();
});

test("carbon-footprint layout: headings beside their beats on wide screens, stacked on narrow ones", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  for (const id of ["started", "workings", "checking", "handover"]) {
    const [h, p] = [await firstBox(page, `#${id}-title`), await firstBox(page, `section[aria-labelledby="${id}-title"] .case-prose`)];
    expect(p.x).toBeGreaterThanOrEqual(h.x + h.width);
  }
  let [lead, facts] = [await firstBox(page, ".case-lead"), await firstBox(page, ".case-facts")];
  expect(facts.x).toBeGreaterThanOrEqual(lead.x + lead.width);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const [h, p] = [await firstBox(page, "#started-title"), await firstBox(page, 'section[aria-labelledby="started-title"] .case-prose')];
    expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    [lead, facts] = [await firstBox(page, ".case-lead"), await firstBox(page, ".case-facts")];
    expect(facts.y).toBeGreaterThanOrEqual(lead.y + lead.height);
  }
});

for (const width of [320, 390, 414, 768, 1366]) {
  test(`carbon-footprint study reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await forEachTextSize(page);
  });
}

visualReview(route);
