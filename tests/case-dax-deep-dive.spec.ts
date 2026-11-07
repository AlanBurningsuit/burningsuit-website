import { test, expect, isTracker, otherScripts } from "./analytics";
import { reportCspViolations, visualReview, expectIndexable } from "./helpers";
import { bespokeRoutes, pages, redirects } from "../src/config/compatibility.mjs";

const route = "/work/dax-deep-dive/";
const primary = "Ask about the DAX deep dive";
const secondary = "See the DAX deep dive on Training";
const quote = "\"Alan was highly praised for his clear explanations, engaging teaching style, and ability to make complex DAX concepts understandable.\"";

test("case study stays static, private and CSP-clean, with no form, embed, image or script", async ({ page, baseURL }) => {
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
  await expect(page).toHaveTitle("DAX deep dive for a local-authority team | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "How a two-day DAX deep dive ran for a local-authority team in 2025: exercises in the room, a worked example afterwards and the organiser's feedback.");
  await expectIndexable(page, { article: true });
  await expect(page.locator(`${otherScripts}, astro-island, [data-rebuild-placeholder], form, iframe, embed, object, main img, main svg`)).toHaveCount(0);
  // A bespoke page outside the compatibility manifest: the catch-all placeholder never generates it, and it adds no redirect.
  expect(Object.keys(pages)).not.toContain("work/dax-deep-dive");
  expect(bespokeRoutes).not.toContain("work/dax-deep-dive");
  expect(Object.values(redirects)).not.toContain(route);
  // A study marks Work as its section, not as the current page.
  await expect(page.locator('nav a[aria-current="true"]')).toHaveText("Work");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("case study tells the approved story in order, anonymously", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("DAX deep dive for a local-authority team");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["The team", "The two days", "Afterwards", "Thinking about a DAX deep dive for your team?"]);
  await expect(page.locator(".case-facts > li")).toHaveText(["A local-authority team", "2 days", "Private", "On site", "DAX deep dive"]);
  await expect(page.locator(".case-prose p")).toHaveText([
    "In 2025 I ran the DAX deep dive privately for a team at a local authority. DAX is the language behind Power BI's calculations, most of which live in measures. The people in the room already worked with Power BI, and the course was about the DAX behind their reports.",
    "I ran it on site, with exercises for people to work through on laptops I provided. The organiser's summary describes it as starting from the basics and progressing to more advanced topics.",
    "One person arrived on the first day confident in what they could already do. They told me they were there to get their head around the advanced material. By mid-morning on the second day, they said they thought they'd go back and rewrite all their old measures.",
    "After the course I sent a worked version of the variables exercise for reference. Variables let you name a step inside a measure and use it again, which makes a long measure easier to read and check.",
    "The organiser then surveyed the people who'd attended. I ran the course twice for them that year, and the summary covers both groups together.",
  ]);
  // One cream proof panel: the quote, its attribution and the figures as plain text; no stars, badge or logo.
  const panel = page.locator("figure.case-evidence");
  await expect(panel).toHaveCount(1);
  await expect(panel.locator("blockquote")).toHaveText(quote);
  await expect(panel.locator(".case-attribution")).toHaveText("The organiser's feedback summary");
  await expect(panel.locator(".case-figures")).toHaveText("4.93 out of 5 overall, from 14 responses across both groups. No points for improvement were raised.");
  await expect(panel.locator("img, svg, meter, progress, [role=img]")).toHaveCount(0);
  expect(await panel.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(241, 236, 217)");
  await expect(page.locator(".case-limits")).toHaveText("This shows how the two days ran and how people said they found them. It doesn't show what changed in their work afterwards.");
  await expect(page.locator(".case-ask .raised-copy > p").first()).toHaveText("The course's current length, delivery and group size are on Training.");
  const text = await page.locator("main").innerText();
  for (const absent of [/★|☆|⭐/, /\[|\]/, /—/, /[£$€]\s*\d/, /february|feb\b/i, /101/, /free call/i, /consultancy/i]) expect(text).not.toMatch(absent);
});

test("the enquiry action and the route back to Training are ordinary links to existing anchors", async ({ page }) => {
  await page.goto(route);
  const ask = page.getByRole("link", { name: primary, exact: true });
  await expect(ask).toHaveAttribute("href", "/training/#contact");
  await expect(ask).toHaveClass(/text-link/);
  await expect(ask).toHaveAccessibleDescription("Name the course in your message.");
  // The ask closes the study on the shared dark closing band, so the link is amber.
  expect(await ask.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(230, 152, 117)");
  await expect(page.locator("#name-course")).toHaveText("Name the course in your message.");
  await expect(page.getByRole("link", { name: secondary, exact: true })).toHaveAttribute("href", "/training/#specialists-title");
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual(["/training/#contact", "/training/#specialists-title"]);
  for (const [name, id] of [[primary, "contact"], [secondary, "specialists-title"]] as const) {
    await page.goto(route);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/training/#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await page.goto("/training/");
  await expect(page.locator("#specialists-title")).toHaveText("Want to dive deeper into Power BI?");
});

test("the relevant course entry and Work index link to the study", async ({ page }) => {
  await page.goto("/training/");
  await expect(page.locator(".specialist-courses").getByRole("link", { name: "DAX deep dive for a local-authority team", exact: true })).toHaveAttribute("href", route);
  await page.goto("/work/");
  await expect(page.locator('[aria-labelledby="courses-title"]').getByRole("link", { name: "DAX deep dive for a local-authority team", exact: true })).toHaveAttribute("href", route);
  for (const from of ["/", "/training/agentic-development-for-power-bi/", "/power-bi/", "/about/", "/contact/", "/call/"]) {
    await page.goto(from);
    await expect(page.locator(`a[href*="dax-deep-dive"]`)).toHaveCount(0);
  }
});

test("case study works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  expect((await page.goto(route))?.status()).toBe(200);
  await expect(page.locator("figure.case-evidence blockquote")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
  }
  expect(reached).toEqual(["/training/#contact", "/training/#specialists-title"]);
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(baseURL + "/training/#specialists-title");
  await context.close();
});

test("case study layout: headings beside prose and figures beside the quote on wide screens, stacked on narrow ones", async ({ page }) => {
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  let heading = await box(".case-beat > h2"), prose = await box(".case-prose");
  expect(prose.x).toBeGreaterThanOrEqual(heading.x + heading.width);
  let quoteBox = await box(".case-evidence blockquote"), figures = await box(".case-figures");
  expect(figures.x).toBeGreaterThanOrEqual(quoteBox.x + quoteBox.width);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    heading = await box(".case-beat > h2"); prose = await box(".case-prose");
    expect(prose.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    quoteBox = await box(".case-evidence blockquote"); figures = await box(".case-figures");
    expect(figures.y).toBeGreaterThanOrEqual(quoteBox.y + quoteBox.height);
    // The panel's hard shadow stays on screen.
    const panel = await box(".case-evidence");
    expect(panel.x + panel.width + 5).toBeLessThanOrEqual(width);
  }
});

for (const width of [320, 390, 414, 768, 1366]) {
  test(`case study reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

visualReview(route);
