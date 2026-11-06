import { type Page } from "@playwright/test";
import { test, expect, isTracker, otherScripts } from "./analytics";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";

const route = "/training/";
const course101 = "/training/agentic-development-for-power-bi/";
const fundamentals = "/training/power-bi-fundamentals/";
const email = "mailto:alan@burningsuit.co.uk";
const privateFacts = ["Private, for your team", "On site or online", "Up to 8 people", "Price on request"];

const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;

test("training chooser stays static, private and CSP-clean", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL && !isTracker(request.url())) external.push(request.url());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
  });
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Power BI courses | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Two places to start with Power BI, and three specialist courses for teams, with length, delivery and group size for each. Price on request.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator(`${otherScripts}, astro-island, link[rel="canonical"], [data-rebuild-placeholder], main img`)).toHaveCount(0);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
  for (const directive of ["default-src 'none'", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
  await expect(page.locator("form")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link")).toHaveText(["Training", "Consultancy", "Work", "About", "Contact"]);
  await expect(page.locator("nav a[aria-current]")).toHaveText("Training");
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("training chooser shows the approved wording, facts and routes", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to page and test together.
  await expect(page.locator("h1")).toHaveText("Power BI courses");
  await expect(page.locator("h1 .em")).toHaveText("courses");
  // Revision 3 omits the opening fit question: the introduction is the only paragraph before the starting points.
  await expect(page.locator(".training-intro > p")).toHaveText("If you're new to Power BI, start with Power BI fundamentals. If you've already built a report, Power BI with AI agents 101 shows you how to start working with an AI agent: a tool that reads a report's files, makes the changes you ask for and shows you what it did.");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Two places to start", "Want to dive deeper into Power BI?", "Want to learn on your own work?", "Who's teaching", "Ask about a course"]);

  const entries = page.getByRole("article");
  await expect(entries.getByRole("heading", { level: 3 })).toHaveText(["Power BI fundamentals", "Power BI with AI agents 101"]);
  const fund = page.getByRole("article", { name: "Power BI fundamentals" });
  await expect(fund.locator("p")).toHaveText(["New to Power BI?", "Learn to build an interactive report, prepare the data behind it and share it with the people who need it.", "No Power BI experience needed."]);
  await expect(fund.locator(".facts > li")).toHaveText(["2 days", ...privateFacts]);
  // The course name links to its outline too.
  await expect(fund.getByRole("link")).toHaveText(["Power BI fundamentals", "Read the course outline", "Ask about dates"]);
  await expect(fund.getByRole("link", { name: "Power BI fundamentals" })).toHaveAttribute("href", fundamentals);
  await expect(fund.getByRole("link", { name: "Read the course outline" })).toHaveAttribute("href", fundamentals);
  await expect(fund.getByRole("link", { name: "Ask about dates" })).toHaveAttribute("href", "#contact");

  const agents = page.getByRole("article", { name: "Power BI with AI agents 101" });
  await expect(agents.locator("p")).toHaveText([
    "Want to be ready for where Power BI is going?",
    "In one morning, you get an AI agent to explain a report you haven't seen before and write notes on its calculations. Then you have it build a new calculation and check its answers yourself.",
    "You've built a report in Power BI Desktop, even a simple one. No coding or AI experience needed.",
    "Want this for your team? Ask about a private course.",
  ]);
  // The public group size is bound to the public date; private runs state no size or format of their own.
  await expect(agents.locator(".facts > li")).toHaveText(["Half a day, live online", "Public course: Wednesday 20 January 2027, 9:30am to 12:30pm UK time, 4 to 8 people", "Also private, for your team", "Price on request"]);
  await expect(agents.locator('time[datetime="2027-01-20"]')).toHaveText("Wednesday 20 January 2027");
  // The 101 keeps booking on its own page: the outline link and the private-course email only, no form route.
  await expect(agents.getByRole("link")).toHaveText(["Power BI with AI agents 101", "Read the course outline", "Ask about a private course."]);
  await expect(agents.getByRole("link", { name: "Read the course outline" })).toHaveAttribute("href", course101);
  await expect(agents.getByRole("link", { name: "Ask about a private course." })).toHaveAttribute("href", email);
  await expect(agents.locator('a[href="#contact"]')).toHaveCount(0);

  const rows = page.locator(".specialist-courses .specialist-rows > li");
  await expect(rows.getByRole("heading", { level: 3 })).toHaveText(["DAX fundamentals", "Data modelling", "DAX deep dive"]);
  for (const [index, length] of ["1 day", "1 day", "2 days"].entries()) await expect(rows.nth(index).locator(".facts > li")).toHaveText([length, ...privateFacts]);
  await expect(rows.locator("p:not(.study-evidence-label)")).toHaveCount(0);
  await expect(rows.locator("a")).toHaveText(["DAX deep dive for a local-authority team"]);
  await expect(page.locator(".specialist-courses .specialists-head p")).toHaveText("Private courses for teams on calculations and table design.");
  const ask = page.getByRole("link", { name: "Ask about one of these" });
  await expect(ask).toHaveAttribute("href", "#contact");
  await expect(ask).toHaveAccessibleDescription("Name the course in your message.");
  await expect(page.locator(".specialist-courses .name-course")).toBeVisible();
  expect((await box(page, ".specialist-courses .name-course")).y).toBeGreaterThan((await box(page, ".specialist-courses .text-link")).y);
  await expect(page.locator(".not-sure")).toHaveText("Not sure which fits? Tell me what you use Power BI for now, and I'll suggest where to start.");
  await expect(page.getByRole("link", { name: "Tell me what you use Power BI for now, and I'll suggest where to start." })).toHaveAttribute("href", "#contact");

  // Coaching (approved 6 Nov amendment): its own quiet section, after the not-sure line and before Who's teaching.
  const coaching = page.locator("section#coaching");
  await expect(coaching).toHaveAttribute("aria-labelledby", "coaching-title");
  await expect(coaching.locator("h2")).toHaveText("Want to learn on your own work?");
  await expect(coaching.locator(".specialists-head p")).toHaveText("Coaching is for 1 to 3 people from the same organisation, ideally the same team, who want to learn Power BI on the work they actually do. I write a syllabus for the people taking part, and we work on your own data, or on example data I build to look like yours, with the problems you're stuck on.");
  await expect(coaching.locator(".specialist-rows > li h3")).toHaveText(["Power BI coaching"]);
  await expect(coaching.locator(".specialist-rows").locator("a, p")).toHaveCount(0);
  await expect(coaching.locator(".specialist-rows .facts > li")).toHaveText(["4 to 8 weeks", "A two-hour session each week, with homework in between", "Up to 3 people from one organisation", "Online, or on site where it suits", "Price on request"]);
  const askCoaching = coaching.getByRole("link", { name: "Ask about coaching", exact: true });
  await expect(askCoaching).toHaveText(["Ask about coaching"]);
  await expect(askCoaching).toHaveAttribute("href", "#contact");
  await expect(askCoaching).toHaveAccessibleDescription("Mention coaching in your message.");
  await expect(coaching.locator("p:not(.study-evidence-label)")).toHaveText([/^Coaching is for/, "Mention coaching in your message."]);
  expect(await page.locator("main > section").evaluateAll((all) => all.map((el) => el.className.split(" ")[0]))).toEqual(["starting-points", "specialist-courses", "coaching", "training-teacher", "contact"]);

  await expect(page.locator(".teacher-note p")).toHaveText("I'm Alan Harman-Box. I write and teach every course myself, and I've spent about five years working with organisations as they adopt Power BI. So when a question leads down a useful rabbit hole, I can follow it and still bring you back to the course.");
  await expect(page.getByRole("link", { name: "How I train" })).toHaveAttribute("href", "/training/how-i-train/");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
  await expect(page.locator(".enquiry-intro p")).toHaveText("If you know which course you want, name it in your message. If you don't, tell me what you use Power BI for now and I'll suggest where to start.");
  await expect(page.locator("#contact .fallback")).toHaveText("Or email alan@burningsuit.co.uk.");

  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual([fundamentals, fundamentals, "#contact", course101, course101, email, "/work/dax-deep-dive/", "#contact", "#contact", "#contact", "/work/contact-centre/", "/work/individual-power-bi-coaching/", "/training/how-i-train/", "/about/", "/work/", ENQUIRY.privacyPath, email]);
  const text = await page.locator("main").innerText();
  // Developing and Claude courses stay off; no arrows, seats, booking or promises the copy doesn't make.
  for (const absent of [/Not sure where to start/i, /hands-on day/i, /Modelling for agents/i, /Claude/, /→|->|›|»/, /seat/i, /book/i, /\[|\]/, /to confirm/i, /coming soon/i]) expect(text).not.toMatch(absent);
  await expect(page.locator("blockquote, .to-confirm, .proof, button:not(.send)")).toHaveCount(0);
});

test("training chooser structure reads in order for assistive technology", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator(".specialist-courses .specialist-rows")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "DAX fundamentals" [level=3]
        - list:
          - listitem: 1 day
          - listitem: Private, for your team
          - listitem: On site or online
          - listitem: Up to 8 people
          - listitem: Price on request
      - listitem:
        - heading "Data modelling" [level=3]
        - list:
          - listitem: 1 day
          - listitem: Private, for your team
          - listitem: On site or online
          - listitem: Up to 8 people
          - listitem: Price on request
      - listitem:
        - heading "DAX deep dive" [level=3]
        - list:
          - listitem: 2 days
          - listitem: Private, for your team
          - listitem: On site or online
          - listitem: Up to 8 people
          - listitem: Price on request
        - list:
          - listitem:
            - link "DAX deep dive for a local-authority team":
              - /url: /work/dax-deep-dive/
  `);
  await expect(page.locator("#coaching .specialist-rows")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "Power BI coaching" [level=3]
        - list:
          - listitem: 4 to 8 weeks
          - listitem: A two-hour session each week, with homework in between
          - listitem: Up to 3 people from one organisation
          - listitem: Online, or on site where it suits
          - listitem: Price on request
  `);
  await expect(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts")).toMatchAriaSnapshot(`
    - list:
      - listitem: Half a day, live online
      - listitem:
        - text: "Public course:"
        - time: Wednesday 20 January 2027
        - text: ", 9:30am to 12:30pm UK time, 4 to 8 people"
      - listitem: Also private, for your team
      - listitem: Price on request
  `);
});

test("training chooser layout: equal entries side by side on wide screens, stacked on phones", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  const [fund, agents] = [await box(page, 'article[aria-labelledby="fundamentals-title"]'), await box(page, 'article[aria-labelledby="agents-101-title"]')];
  expect(Math.abs(fund.width - agents.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(fund.y - agents.y)).toBeLessThanOrEqual(1);
  expect(agents.x).toBeGreaterThanOrEqual(fund.x + fund.width);
  // Starting points follow the opening straight away: no facts column or portrait beside it.
  const intro = await box(page, ".training-intro");
  expect(fund.y).toBeGreaterThan(intro.y + intro.height - 1);
  expect(fund.y).toBeLessThan(900);
  // Specialists sit below the entries, lighter, with each name beside its facts.
  const rows = await box(page, ".specialist-courses .specialist-rows");
  expect(rows.y).toBeGreaterThan(Math.max(fund.y + fund.height, agents.y + agents.height));
  for (const row of await page.locator(".specialist-rows > li").all()) {
    const [name, facts] = [(await row.locator("h3").boundingBox())!, (await row.locator(".facts").boundingBox())!];
    expect(facts.x).toBeGreaterThanOrEqual(name.x + name.width);
  }
  const size = (selector: string) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size(".specialist-rows h3")).toBeLessThan(await size(".course h3"));
  const [teacherHead, teacherNote] = [await box(page, "#teacher-title"), await box(page, ".teacher-note")];
  expect(teacherNote.x).toBeGreaterThanOrEqual(teacherHead.x + teacherHead.width);
  // Coaching follows the specialists' not-sure line and precedes Who's teaching, with the same lighter row and heading sizes.
  const coachingBox = await box(page, "#coaching");
  expect(coachingBox.y).toBeGreaterThanOrEqual((await box(page, ".specialist-courses .not-sure")).y);
  expect(teacherHead.y).toBeGreaterThan(coachingBox.y + coachingBox.height - 1);
  expect(await size("#coaching h3")).toBe(await size(".specialist-courses h3"));
  expect(await size("#coaching-title")).toBe(await size("#specialists-title"));

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const [f, a] = [await box(page, 'article[aria-labelledby="fundamentals-title"]'), await box(page, 'article[aria-labelledby="agents-101-title"]')];
    expect(a.y).toBeGreaterThanOrEqual(f.y + f.height);
    for (const row of await page.locator(".specialist-rows > li").all()) {
      const [name, facts] = [(await row.locator("h3").boundingBox())!, (await row.locator(".facts").boundingBox())!];
      expect(facts.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
    }
    const [head, note] = [await box(page, "#teacher-title"), await box(page, ".teacher-note")];
    expect(note.y).toBeGreaterThanOrEqual(head.y + head.height);
    // Every action stays on screen; standalone links are comfortable targets (links inside sentences are exempt).
    for (const link of await page.locator("main a").all()) {
      for (const r of await link.evaluate((el) => [...el.getClientRects()].map(({ left, right }) => ({ left, right })))) {
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(width);
      }
    }
    for (const link of await page.locator("main .text-link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  }
});

test("the starting points carry the page's weight: lifted, spined cards with field-guide deciding facts on the daylight body", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  const bg = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  // The dark opening and enquiry band bookend the daylight body; the entries are cards lifted off it, the specialists a quieter recessed block.
  const ground = await bg("main");
  expect(ground).not.toBe(await bg("body"));
  // The title band sits on the dark stage; the introduction opens the daylight sheet.
  expect(await page.locator(".title-band").evaluate((el) => getComputedStyle(el.closest(".dark")!).backgroundColor)).toBe(await bg("body"));
  expect(await page.locator(".training-intro").evaluate((el) => el.closest(".dark"))).toBeNull();
  for (const selector of [".starting-points", ".specialist-courses", ".training-teacher", ".specialist-rows > li"]) expect(await bg(selector)).toBe("rgba(0, 0, 0, 0)");
  const band = await bg(".starting-points .course");
  expect(band).not.toBe(ground);
  expect(await bg(".specialist-rows")).not.toBe(ground);
  expect(await bg(".specialist-rows")).not.toBe(band);
  for (const selector of ["#coaching", "#coaching .specialist-rows > li"]) expect(await bg(selector)).toBe("rgba(0, 0, 0, 0)");
  expect(await bg("#contact")).not.toBe(ground);
  // Each entry keeps its facts and prerequisite together in one block on the card itself: the facts in the mono
  // metadata voice with its label in small tracked capitals, the prerequisite in the body voice.
  const bodyFont = await page.locator("main p").first().evaluate((el) => getComputedStyle(el).fontFamily);
  for (const entry of await page.getByRole("article").all()) {
    const deciding = entry.locator(".deciding");
    await expect(deciding).toHaveCount(1);
    await expect(deciding.locator(".facts")).toHaveCount(1);
    await expect(deciding.locator(".prereq")).toHaveCount(1);
    expect(await deciding.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    const facts = await deciding.locator(".facts").evaluate((el) => { const c = getComputedStyle(el); return { font: c.fontFamily, transform: c.textTransform }; });
    expect(facts.font).toMatch(/Burningsuit Reader/);
    expect(facts.transform).toBe("none");
    for (const label of await deciding.locator(".fact-label").all()) expect(await label.evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase");
    expect(await deciding.locator(".prereq").evaluate((el) => getComputedStyle(el).fontFamily)).toBe(bodyFont);
    const spine = await entry.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
    // A spine, heavier than the specialists' hairline rows.
    expect(spine).toBeGreaterThan(await page.locator(".specialist-rows > li").first().evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth)));
  }
  // Side by side, the two entries start level and their titles line up; each takes its natural height, so inside
  // each card the links follow straight on from the deciding facts and no hole opens between them.
  const rects = async (selector: string) => page.locator(selector).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }));
  const [cardA, cardB] = await rects(".starting-points .course");
  expect(Math.abs(cardA.top - cardB.top)).toBeLessThanOrEqual(1);
  const [titleA, titleB] = await rects(".starting-points .course h3");
  expect(Math.abs(titleA.top - titleB.top)).toBeLessThanOrEqual(1);
  const decidings = await rects(".starting-points .deciding"), actions = await rects(".starting-points .course-actions");
  for (const [index, block] of decidings.entries()) expect(actions[index].top - block.bottom).toBeLessThanOrEqual(40);
  // The cards open on the daylight warm accent (the ochre tick
  // before each card's fit line), which the teacher note's rule does not carry.
  const size = (selector: string) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  // One heading scale: every section heading is the same size; the starting points carry their weight through the cards.
  expect(await size("#specialists-title")).toBe(await size("#start-points-title"));
  expect(await size("#coaching-title")).toBe(await size("#start-points-title"));
  // Coaching stays quieter than the starting points: no spine, card or article.
  expect(await page.locator("#coaching").evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("none");
  await expect(page.locator("#coaching article, #coaching .deciding, #coaching .course-fit")).toHaveCount(0);
  const warm = await page.locator(".starting-points .course-fit").first().evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  const amber = await page.locator("h1 .em").evaluate((el) => getComputedStyle(el).color);
  expect(warm).not.toBe(amber);
  expect(await page.locator(".teacher-note").evaluate((el) => getComputedStyle(el).borderLeftColor)).not.toBe(warm);
  expect(await page.getByRole("article").first().evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(warm);
});

test("fact separators never start or end a wrapped line", async ({ page }) => {
  const separators = async () => page.locator("main .dot-list").evaluateAll((lists) => lists.flatMap((list) => {
    const edge = list.getBoundingClientRect().left;
    return [...list.children].map((item) => {
      const left = item.getBoundingClientRect().left;
      return { rowStart: Math.abs(left - edge) < 1, shown: left + parseFloat(getComputedStyle(item, "::before").left) >= edge };
    });
  }));
  await page.goto(route);
  for (const width of [1366, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const { rowStart, shown } of await separators()) expect(shown).toBe(!rowStart);
  }
});

for (const width of [320, 390, 768, 1024, 1366]) {
  test(`training chooser reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // No element's content spills past its own box sideways.
      const spills = await page.locator("main *").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0).map((el) => el.className || el.tagName));
      expect(spills).toEqual([]);
    }
  });
}

test("training chooser works from the keyboard without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(2);
  }
  expect(reached).toEqual([fundamentals, fundamentals, "#contact", course101, course101, email, "/work/dax-deep-dive/", "#contact", "#contact", "#contact", "/work/contact-centre/", "/work/individual-power-bi-coaching/", "/training/how-i-train/", "/about/", "/work/"]);

  // An inbound coaching link lands on its section without JavaScript; its ask reaches the shared form.
  await page.goto(route + "#coaching");
  await expect(page.locator("#coaching-title")).toBeInViewport();
  await page.getByRole("link", { name: "Ask about coaching" }).click();
  await expect(page).toHaveURL(baseURL! + route + "#contact");
  await expect(page.getByRole("form", { name: "Ask about a course" })).toBeInViewport();
  await page.goto(route);

  // The 101 outline leads to its own page, where booking stays closed.
  await page.getByRole("article", { name: "Power BI with AI agents 101" }).getByRole("link", { name: "Read the course outline" }).click();
  await expect(page).toHaveURL(baseURL! + course101);
  await expect(page.getByRole("button", { name: "Book a seat" }).first()).toBeDisabled();
  await context.close();
});

for (const outcome of ["success", "error"] as const) {
  test(`specialist enquiry posts plainly from the chooser without JavaScript (${outcome})`, async ({ browser, baseURL }) => {
    // The provider is stubbed: no sample enquiry is ever sent.
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    const violations: string[] = [];
    page.on("console", (message) => { if (/content security policy/i.test(message.text())) violations.push(message.text()); });
    let payload: URLSearchParams | undefined;
    let requests = 0;
    await context.route(ENQUIRY.action!, async (request) => {
      requests++;
      expect(request.request().method()).toBe("POST");
      payload = new URLSearchParams(request.request().postData()!);
      await request.fulfill({ status: 302, headers: { location: new URL(payload.get(outcome === "success" ? "_redirect" : "_error")!, baseURL).href } });
    });
    await page.goto(route);
    await page.getByRole("link", { name: "Ask about one of these" }).click();
    await expect(page).toHaveURL(baseURL! + route + "#contact");
    const form = page.getByRole("form", { name: "Ask about a course" });
    await expect(form).toBeInViewport();
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", ENQUIRY.action!);
    await expect(form.getByRole("textbox")).toHaveCount(3);
    await expect(form.getByRole("radio")).toHaveCount(0);

    // Native validation holds an incomplete enquiry on the page.
    await form.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator("#enquiry-email")).toBeFocused();
    expect(requests).toBe(0);

    await form.getByLabel("Name (optional)", { exact: true }).fill("Test Person");
    await form.getByLabel("Email", { exact: true }).fill("test@example.com");
    await form.getByLabel("Your message", { exact: true }).fill("DAX deep dive for a team of five.");
    await form.getByRole("button", { name: "Send", exact: true }).click();
    const path = outcome === "success" ? ENQUIRY.successPath : ENQUIRY.errorPath;
    await expect(page).toHaveURL(new URL(path, baseURL).href);
    expect(new URL(page.url()).search).toBe("");
    expect(requests).toBe(1);
    expect(payload!.has("about")).toBe(false);
    expect(payload!.get("message")).toBe("DAX deep dive for a team of five.");
    expect(payload!.get("_append")).toBe("false");
    expect(payload!.has("_gotcha")).toBe(false);
    expect(violations).toEqual([]);
    await context.close();
  });
}

for (const width of [1366, 390]) {
  test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const capture = info.outputPath("page.png");
    await page.screenshot({ path: capture, fullPage: true });
    await info.attach("page", { path: capture, contentType: "image/png" });
  });
}
