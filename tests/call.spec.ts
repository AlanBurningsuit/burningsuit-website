import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, firstBox, forEachTextSize, watchPage } from "./helpers";
import { pages, redirects } from "../src/config/compatibility.mjs";

const route = "/call/";
const booking = "https://cal.com/alan-burningsuit/call";
const label = "Book a free 30-minute call";

// The booking provider is never contacted by these checks.
test.beforeEach(async ({ context }) => { await context.route("https://cal.com/**", (request) => request.abort()); });

test("free call page stays static, private and CSP-clean, with no form, embed or script", async ({ page, baseURL }) => {
  const watch = await watchPage(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Free 30-minute Power BI call | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Book a free 30-minute call with me, Alan Harman-Box, about your own Power BI. Talk through what's happening and whether I can help.");
  await expectIndexable(page);
  await expect(page.locator(`${otherScripts}, astro-island, form, iframe, embed, object, main img`)).toHaveCount(0);
  // The old /hour/ address, live on the current site, now redirects here.
  expect(redirects["/hour"]).toBe("/call/");
  expect(pages).not.toHaveProperty("hour");
  // Consultancy's page: the nav marks Consultancy as the section, not as this page.
  await expect(page.locator('nav a[aria-current="true"]')).toHaveText("Consultancy");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(0);
  watch.expectClean();
});

test("free call page answers the visitor's questions in order, in the approved words", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("A free 30-minute call about your Power BI");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What happens", "Book your call"]);
  await expect(page.locator(".title-band .standfirst")).toHaveText("Got a problem with your own Power BI, and not sure whether I can help?");
  // Duration and lack of charge sit at the top, beside the introduction.
  await expect(page.locator("section.course-run")).toHaveAttribute("aria-label", "Call facts and booking");
  await expect(page.locator(".run-facts > li")).toHaveText(["30 minutes, free", "On Microsoft Teams", "You talk to me, Alan", "Follow-up afterwards if it needs more thought", "Any further work quoted separately"]);
  // Two unraised numbered steps; the counter is decorative, the list semantics carry the order.
  await expect(page.locator(".do-steps")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "On the call." [level=3]
        - paragraph
      - listitem:
        - heading "Afterwards." [level=3]
        - paragraph
  `);
  expect(await page.locator(".call-steps").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  // The opening sets no preparation requirement and promises no outcome; pinned wording changes only with Alan's approval.
  await expect(page.locator(".course-intro > p:not(.standfirst)")).toHaveText("I'm Alan Harman-Box. Tell me about it on a call. Maybe your reporting all rests on one person, or two reports give different answers to the same question, or it's something you can't quite put a name to yet. You don't need a polished brief to book.");
  await expect(page.locator(".do-steps > li > p")).toHaveText([
    "You tell me what's going on, and I ask questions to understand it better. We stay on what matters most to you. Sometimes that's enough: I can point you to what to do next, or tell you if it isn't something I can help with.",
    "If I need more time to think about it, I'll follow up after the call. If there's work I can help with, I'll quote for it separately, usually as a fixed price.",
  ]);
  await expect(page.locator(".call-book p")).toHaveText([
    "You'll be talking to me, and if we go on to work together, I'm the one who does the work. More about me",
    "Pick a time that suits you on my booking page.",
    "Prefer to write? Send me a message",
    "More about my consultancy",
  ]);
  const text = await page.locator("main").innerText();
  for (const absent of [/free hour/i, /\bhour\b/i, /\[|\]/, /—/, /[£$€]\s*\d/, /record/i, /audit/i, /diagnos/i, /proposal/i, /training/i, /case stud/i, /no obligation/i]) expect(text).not.toMatch(absent);
});

test("both booking actions are the same ordinary same-tab link, styled as the shared button for their ground", async ({ page }) => {
  await page.goto(route);
  const actions = page.getByRole("link", { name: label, exact: true });
  await expect(actions).toHaveCount(2);
  // On the daylight facts card the button is ochre with leaf text; in the dark booking band it is amber with deep text.
  const grounds = [{ bg: "rgb(127, 83, 10)", color: "rgb(251, 252, 249)" }, { bg: "rgb(230, 152, 117)", color: "rgb(28, 34, 38)" }];
  for (const [index, action] of (await actions.all()).entries()) {
    await expect(action).toHaveAttribute("href", booking);
    await expect(action).not.toHaveAttribute("target", /./);
    await expect(action).toHaveClass(/\bbutton\b/);
    const style = await action.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, cursor: s.cursor }; });
    expect(style.bg).toBe(grounds[index].bg);
    expect(style.color).toBe(grounds[index].color);
    expect(style.cursor).toBe("pointer");
    await action.focus();
    expect(await action.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(3);
  }
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual([booking, "/about/", booking, "/contact/", "/power-bi/"]);
  await expect(page.getByRole("link", { name: "Send me a message" })).toHaveAttribute("href", "/contact/");
  await expect(page.getByRole("link", { name: "More about my consultancy" })).toHaveAttribute("href", "/power-bi/");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
});

test("Home and Consultancy route their call invitations through this page, which alone links to booking", async ({ page }) => {
  for (const [from, count] of [["/", 1], ["/power-bi/", 3]] as const) {
    await page.goto(from);
    const invites = page.getByRole("link", { name: label, exact: true });
    await expect(invites).toHaveCount(count);
    for (const invite of await invites.all()) await expect(invite).toHaveAttribute("href", route);
    await expect(page.locator('a[href*="cal.com"]')).toHaveCount(0);
    expect(await page.locator("main").innerText()).not.toMatch(/free hour/i);
  }
  await page.goto("/");
  await page.getByRole("link", { name: label, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${route}$`));
  await expect(page.locator("h1")).toHaveText("A free 30-minute call about your Power BI");
});

test("free call page works without JavaScript and from the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  await context.route("https://cal.com/**", (request) => request.abort());
  const page = await context.newPage();
  await page.goto("/power-bi/");
  await page.getByRole("link", { name: "The free call", exact: true }).click();
  await expect(page).toHaveURL(baseURL! + route);
  await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
  }
  expect(reached).toEqual([booking, "/about/", booking, "/contact/", "/power-bi/"]);
  // The writing alternative and the wider offer resolve without JavaScript. On this branch /contact/ is still the legacy redirect.
  for (const name of ["Send me a message", "More about my consultancy", "More about me"]) {
    await page.goto(route);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.locator("h1")).toBeVisible();
    expect(page.url()).not.toBe(baseURL! + route);
  }
  await context.close();
});

test("free call layout: facts beside the introduction on wide screens, after it on narrow ones", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  let intro = await firstBox(page, ".course-intro"), facts = await firstBox(page, ".course-run");
  expect(facts.x).toBeGreaterThanOrEqual(intro.x + intro.width);
  expect(facts.y).toBeLessThan(intro.y + intro.height);
  // The steps run left to right under their heading, as on Consultancy; the booking copy sits beside its action.
  const [lead, steps] = [await firstBox(page, "#happens-title"), await firstBox(page, ".do-steps")];
  // "What happens" sits under the introduction, beside the facts card.
  const happens = await firstBox(page, ".call-steps");
  expect(happens.y).toBeGreaterThanOrEqual(intro.y + intro.height);
  expect(happens.x + happens.width).toBeLessThanOrEqual(facts.x);
  expect(steps.y).toBeGreaterThanOrEqual(lead.y + lead.height);
  const [first, second] = await page.locator(".do-steps > li").all();
  expect((await second.boundingBox())!.x).toBeGreaterThan((await first.boundingBox())!.x);
  const [copy, action] = [await firstBox(page, ".call-book .closing-inner > div:first-child"), await firstBox(page, ".call-book .book-link")];
  expect(action.x).toBeGreaterThanOrEqual(copy.x + copy.width);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    intro = await firstBox(page, ".course-intro"); facts = await firstBox(page, ".course-run");
    expect(facts.y).toBeGreaterThanOrEqual(intro.y + intro.height);
    expect((await firstBox(page, ".call-steps")).y).toBeGreaterThanOrEqual(facts.y + facts.height);
    // Each booking action, its hard shadow and its focus ring stay on screen.
    for (const action of await page.locator("a.book-link").all()) {
      const edges = await action.evaluate((el) => {
        (el as HTMLElement).focus();
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        const out = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        return { left: r.left - out, right: Math.max(r.right + out, r.right + 4) };
      });
      expect(edges.left).toBeGreaterThanOrEqual(0);
      expect(edges.right).toBeLessThanOrEqual(width);
    }
  }
});

test("loading the shared logo does not move the page", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 823 });
  let releaseLogo!: () => void;
  const pendingLogo = new Promise<void>((resolve) => { releaseLogo = resolve; });
  await page.route("**/logos/burningsuit-on-green.svg", async (request) => {
    await pendingLogo;
    await request.continue();
  });
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  const before = (await page.locator("main").boundingBox())!.y;
  releaseLogo();
  await page.locator(".brand img").evaluate((image) => (image as HTMLImageElement).decode());
  const after = (await page.locator("main").boundingBox())!.y;
  expect(Math.abs(after - before)).toBeLessThan(1);
});

test("loaded fonts leave no empty reserved line at phone wrap boundaries", async ({ page }) => {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [352, 353, 359, 390, 412, 413, 414, 423, 424, 428, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const selector of [".title-band h1", ".run-facts li:nth-child(3)"]) {
      const extra = await page.locator(selector).evaluate((element) => {
        const el = element as HTMLElement;
        const actual = el.getBoundingClientRect().height;
        const previous = el.style.minHeight;
        el.style.minHeight = "0";
        const natural = el.getBoundingClientRect().height;
        el.style.minHeight = previous;
        return actual - natural;
      });
      expect(extra, `${selector} has an empty reserved line at ${width}px`).toBeLessThan(1);
    }
  }
});

for (const width of [320, 390, 414, 428, 768, 1366]) {
  test(`free call page reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await forEachTextSize(page, async () => {
      for (const action of await page.locator("a.book-link").all()) {
        const b = (await action.boundingBox())!;
        expect(b.x + b.width).toBeLessThanOrEqual(width);
      }
    });
  });
}

visualReview(route);
