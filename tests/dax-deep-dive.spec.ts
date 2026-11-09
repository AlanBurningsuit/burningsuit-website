import { type Page } from "@playwright/test";
import { test, expect, isTracker, otherScripts } from "./analytics";
import { reportCspViolations, visualReview, expectIndexable } from "./helpers";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";
import { redirects } from "../src/config/compatibility.mjs";
import { priced, copy, expectItems, expectAttribute, expectAmountsOnlyWhenPriced, expectNone, expectAriaWithoutAmounts, priceOnRequest } from "./prices";

// Approved wording: ops site/dax-deep-dive-page-copy.md, candidate 4 (7 Nov 2026). Pinned on purpose: changing it needs Alan's approval.
const route = "/training/dax-deep-dive/";
const email = "mailto:alan@burningsuit.co.uk";
// The decision hero's action comes first: it sits on the dark stage, above the introduction.
const links = ["#contact", "/training/power-bi-fundamentals/", "/training/", "/training/how-i-train/", "/about/", "/work/dax-deep-dive/", "/training/how-i-train/#private-courses", ENQUIRY.privacyPath, email];
const demonstrated = "Demonstrated, not practised.";

const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;

test("DAX deep dive page stays static, private, price-safe and CSP-clean", async ({ page, baseURL }) => {
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
  await expect(page).toHaveTitle("DAX deep dive | burningsuit");
  const baseDescription = "A two-day private course for teams who already write measures in Power BI: learn why your measures return the numbers they do, and how to make them return the ones you need.";
  await expectAttribute(page.locator('meta[name="description"]'), "content", priced ? baseDescription : `${baseDescription} Price on request.`, "deep dive description");
  await expectIndexable(page);
  await expect(page.locator(`${otherScripts}, astro-island, [data-rebuild-placeholder]`)).toHaveCount(0);
  // No portrait or new diagram: the brief allows none. The one figure is the organiser's quote (Alan cleared it, 8 Nov).
  await expect(page.locator("main img, main svg")).toHaveCount(0);
  await expect(page.locator("main figure")).toHaveCount(1);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
  for (const directive of ["default-src 'none'", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("form")).toHaveCount(1);
  await expect(page.locator("nav a[aria-current]:not(.nav-menu a)")).toHaveText("Training");
  await expect(page.locator('.nav-menu a[aria-current="page"]')).toHaveText("DAX deep dive");
  // Private only: no public run, booking or payment route. Unpriced output says Price on request once; priced output shows the private rates and never that phrase.
  // The shared footer's "Booking terms" link is site furniture, not this page's wording.
  const body = (await page.locator("body").innerText()).replace(await page.locator("footer").innerText(), "");
  await expectAmountsOnlyWhenPriced(page, "deep dive");
  if (!priced) expectNone(body, [/\d\s*(GBP|ex VAT)/i], "deep dive unpriced");
  await expect(page.getByText(priceOnRequest, { exact: true })).toHaveCount(priced ? 0 : 1);
  await expect(page.locator("main button:not(.send), main time, main a[href*='stripe'], main a[href*='pay'], main a[href*='cal.com']")).toHaveCount(0);
  // The rating and count appear only in the organiser's pull quote (Alan cleared it for this page, 8 Nov), never in the copy around it; no study wording ("praised"); no DAX fundamentals or "foundations" framing. The teaching-data name is kept out of tracked source, so it isn't asserted here.
  const quoteText = await page.locator(".outcomes figure.pull-quote").innerText();
  expectNone(body.replace(quoteText, "").replaceAll("per booking", ""), [/seat/i, /book/i, /public/i, /founding/i, /free call/i, /DAX fundamentals/, /foundation/i, /out of 5|responses|praised/i, /★|☆/, /\[|\]|\{|\}/, /—/], "deep dive text");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("DAX deep dive page renders the approved wording and question order", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("DAX deep dive");
  await expect(page.locator("h1 .em")).toHaveText("deep dive");
  await expect(page.locator(".title-band .standfirst")).toHaveText("Already writing measures, but not always sure why they return what they do?");
  const opening = page.locator(".course-intro > p:not(.standfirst):not(.course-fit)");
  await expect(opening).toHaveText("Write DAX you can explain, not just copy. A two-day course for people who already build reports in Power BI. You'll learn why your measures return the numbers they do, and how to make them return the ones you need.");
  await expect(opening.locator("strong")).toHaveText("Write DAX you can explain, not just copy.");
  const fit = page.locator(".course-fit");
  await expect(fit).toHaveText("You'll get most from it if you've already written a few measures. If you haven't built a report yet, it's too early: start with Power BI fundamentals, or compare all the courses.");
  await expect(fit.getByRole("link", { name: "Power BI fundamentals" })).toHaveAttribute("href", "/training/power-bi-fundamentals/");
  await expect(fit.getByRole("link", { name: "compare all the courses" })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you'll be able to do", "The two days", "What to arrange", "Ask about dates"]);

  // Priced output omits "On site or online" (the price item names both) and carries amounts, so it is checked by in-memory text rather than an ARIA snapshot.
  const facts = page.getByRole("region", { name: "Course facts" }).locator(".run-facts");
  await expectItems(page.locator(".hero-facts .run-facts > li"), copy
    ? ["2 days", "Private, for your team", "Up to 8 people", "9:30am to 4pm each day", copy.daxDeepDiveDetail]
    : ["2 days", "Private, for your team", "On site or online", "Up to 8 people", "9:30am to 4pm each day", priceOnRequest], "deep dive facts");
  if (!priced) await expectAriaWithoutAmounts(facts, `
    - list:
      - listitem: 2 days
      - listitem: Private, for your team
      - listitem: On site or online
      - listitem: Up to 8 people
      - listitem: 9:30am to 4pm each day
      - listitem: Price on request
  `);
  await expect(page.locator(".run-action")).toHaveText("Ask about dates");
  await expect(page.locator(".run-action")).toHaveAttribute("href", "#contact");

  // Outcomes are ruled, not a second numbered sequence.
  await expect(page.locator(".outcomes ol")).toHaveCount(0);
  await expect(page.locator(".outcomes .need-list > li")).toHaveText([
    "Say why a measure returns the number it does: row context, filter context, and how a star schema (one table of events, such as sales, with lookup tables around it) shapes the filters.",
    "Write measures with iterators (SUMX and the others) instead of calculated columns.",
    "Use CALCULATE with FILTER, ALL, ALLEXCEPT and ALLSELECTED, for example for percentage-of-total measures that respond to the slicers you want them to.",
    "Rewrite long measures with variables, so they're easier to read and check.",
    "Write DAX queries in DAX query view to see and test table expressions, such as TOPN and VALUES.",
    "Use time intelligence on a valid date table: previous period, year to date, and change from one period to the next.",
  ]);

  // How it runs: the lead, then the exercises line opens the agenda body, immediately before Day 1.
  await expect(page.locator(".agenda .do-lead p")).toHaveText("I explain and demonstrate using data prepared for teaching. You write measures and queries in exercises, with time for questions. Online has the same content and exercises.");
  expect(await page.locator(".agenda .do-body > *").evaluateAll((els) => els.slice(0, 2).map((el) => el.textContent))).toEqual(["Exercises include rewriting a set of long measures with variables.", "Day 1: how DAX evaluates a measure"]);

  // Both day groups continue one 01–11 sequence, visually and for assistive technology.
  await expect(page.locator(".agenda .day-title")).toHaveText(["Day 1: how DAX evaluates a measure", "Day 2: controlling the filters"]);
  await expect(page.locator("#day-1-title")).toHaveCount(1);
  await expect(page.locator("#day-2-title")).toHaveCount(1);
  const steps = page.locator(".agenda-steps > li");
  await expect(steps).toHaveCount(11);
  await expect(page.locator(".agenda-steps").nth(1)).toHaveAttribute("start", "6");
  expect(await steps.nth(5).evaluate((li) => (li.parentElement as HTMLOListElement).start)).toBe(6);
  await expect(steps).toHaveText([
    "Start from the model: fact tables, lookup tables and star schemas, and why DAX is easiest with a star schema. This isn't a data modelling course.",
    "Columns and measures: how a DAX expression is built, RELATED, implicit measures, SUM, COUNTROWS and DISTINCTCOUNT.",
    "Evaluation context: row context and filter context, why calculated columns are rarely needed, and iterators (SUMX and the others) that bring row context into a measure.",
    `Reading the filter context: SELECTEDVALUE, and parameter tables that let report users switch what a measure shows. ${demonstrated}`,
    "CALCULATE: simple true/false filters, then FILTER to add filters and ALL to remove them, for percentage-of-total measures.",
    "More ways to remove filters: ALLEXCEPT and ALLSELECTED, and what a visual's total row is actually calculating.",
    `Blanks and zeros: why a filter for zero also picks up blanks. ${demonstrated}`,
    "Variables: rewriting long measures so they're easier to read and check.",
    "Tables in DAX: ALL, FILTER, TOPN and VALUES as tables you can see and test in DAX query view.",
    "Time intelligence: a valid date table with auto date/time turned off, then previous period, year to date and change from one period to the next.",
    `Beyond the star schema: USERELATIONSHIP for inactive relationships, CROSSFILTER instead of two-way relationships, and dynamic titles with VALUES and CONCATENATEX. ${demonstrated}`,
  ]);
  await expect(steps.locator("strong")).toHaveText(["Start from the model:", "Columns and measures:", "Evaluation context:", "Reading the filter context:", "CALCULATE:", "More ways to remove filters:", "Blanks and zeros:", "Variables:", "Tables in DAX:", "Time intelligence:", "Beyond the star schema:"]);
  // The demonstrated tag marks exactly the three demonstrated topics (items 04, 07 and 11), as a quiet label at the end of the item.
  const tagged = await steps.evaluateAll((items) => items.map((li, i) => (li.querySelector(".demo-tag") ? i + 1 : 0)).filter(Boolean));
  expect(tagged).toEqual([4, 7, 11]);
  await expect(page.locator(".demo-tag")).toHaveText([demonstrated, demonstrated, demonstrated]);
  expect(await page.locator(".demo-tag").evaluateAll((els) => els.every((el) => el === el.parentElement!.lastElementChild))).toBe(true);
  await expect(page.locator(".agenda")).toMatchAriaSnapshot(`
    - heading /^Day 1/ [level=3]
    - list /^Day 1/:
      - listitem
      - listitem
      - listitem
      - listitem
      - listitem
    - heading /^Day 2/ [level=3]
    - list /^Day 2/:
      - listitem
      - listitem
      - listitem
      - listitem
      - listitem
      - listitem
  `);

  // One teacher line below the spine, then the one proof line above the study link: no quote, rating or count.
  await expect(page.locator(".teacher-line p")).toHaveText("I'm Alan Harman-Box, and I write and teach every course myself.");
  await expect(page.locator(".teacher-line a")).toHaveText(["How I train", "More about me"]);
  await expect(page.locator(".proof-line")).toHaveText("I've run the DAX deep dive for teams since 2023.");
  const study = page.locator(".course-proof .study-evidence");
  await expect(study.locator(".study-evidence-label")).toHaveText("Case study");
  await expect(study.getByRole("link")).toHaveText(["DAX deep dive for a local-authority team"]);
  await expect(page.locator("main .case-figures")).toHaveCount(0);
  const quote = page.locator(".outcomes figure.pull-quote");
  await expect(quote.locator("blockquote")).toHaveText("\"Participants found the training to be one of the best they've attended.\"");
  await expect(quote.locator("figcaption")).toContainText("Course organiser's feedback summary, a local authority");
  await expect(quote.locator(".pull-figures")).toHaveText("4.93 out of 5 overall, from 14 responses across two runs of the course. No points for improvement were raised.");
  await expect(page.locator("main blockquote")).toHaveCount(1);

  // What to arrange: one pointer line to How I train's private course terms; no list or keep paragraph.
  await expect(page.locator("#need-title")).toHaveText("What to arrange");
  const need = page.locator("section[aria-labelledby='need-title']");
  await expect(need.locator(".need-body > *")).toHaveCount(1);
  await expect(need.locator(".need-pointer")).toHaveText("For dates, setup, payment and cancelling, see the private course terms.");
  await expect(need.getByRole("link", { name: "see the private course terms" })).toHaveAttribute("href", "/training/how-i-train/#private-courses");
  await expect(need.locator("ul, .keep, .need-note")).toHaveCount(0);
  await expect(page.locator(".to-confirm")).toHaveCount(0);

  await expect(page.locator(".enquiry-intro p")).toHaveText("Tell me you're interested in the DAX deep dive, how many people would come and roughly when.");
  await expect(page.locator("#contact .fallback")).toHaveText("Or email alan@burningsuit.co.uk.");
  const mainLinks = await page.locator("main a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(mainLinks).toEqual(links);
});

test("the old DAX advanced course URL redirects to the DAX deep dive page", async ({ page, baseURL }) => {
  const legacy = "/fully-flexible-training-dax-skills/our-courses-power-bi-training/11-power-bi-dax-advanced";
  expect((redirects as Record<string, string>)[legacy]).toBe(route);
  await page.goto(legacy);
  await expect(page).toHaveURL(baseURL + route);
  await expect(page.locator("h1")).toHaveText("DAX deep dive");
  // The neighbouring DAX fundamentals URL leads to its own page, not this one.
  expect((redirects as Record<string, string>)["/fully-flexible-training-dax-skills/our-courses-power-bi-training/10-power-bi-dax-fundamentals"]).toBe("/training/dax-fundamentals/");
});

test("DAX deep dive layout: facts and action in the decision hero, above the introduction at every width", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  // The facts and action sit in the decision hero (tests/decision-hero.spec.ts), above the introduction.
  let intro = await box(page, ".course-intro"), facts = await box(page, ".hero-facts");
  expect(intro.y).toBeGreaterThanOrEqual(facts.y + facts.height);
  // The agenda is the page's raised band; outcomes and arrangements sit on the ground.
  const bg = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(".agenda")).not.toBe(await bg("body"));
  for (const selector of [".outcomes", "section[aria-labelledby='need-title']"]) expect(await bg(selector)).toBe("rgba(0, 0, 0, 0)");
  // The demonstrated tag is quieter than the item it marks.
  const size = (selector: string) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size(".demo-tag")).toBeLessThan(await size(".agenda-steps p"));
  // On wide screens the two days run side by side.
  const [day1, day2] = [await box(page, "#day-1-title"), await box(page, "#day-2-title")];
  expect(day2.x).toBeGreaterThanOrEqual(day1.x + day1.width);
  expect(Math.abs(day1.y - day2.y)).toBeLessThanOrEqual(1);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    intro = await box(page, ".course-intro"); facts = await box(page, ".hero-facts");
    expect(intro.y).toBeGreaterThanOrEqual(facts.y + facts.height);
    expect((await box(page, ".outcomes")).y).toBeGreaterThanOrEqual(intro.y + intro.height);
    for (const selector of [".agenda-steps", ".need-list", ".run-facts", ".course-proof"]) {
      for (const item of await page.locator(selector).all()) {
        const b = (await item.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
      }
    }
    for (const link of await page.locator("main a").all()) {
      for (const r of await link.evaluate((el) => [...el.getClientRects()].map(({ left, right }) => ({ left, right })))) {
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(width);
      }
    }
    for (const link of await page.locator("main .text-link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  }
});

test("the agenda's visible numbers run 01 to 11 across both days", async ({ browser, baseURL }) => {
  // The numbers are decorative (alt text ""), so a test-only style exposes the same counter to Chromium's accessibility tree.
  const context = await browser.newContext({ baseURL, bypassCSP: true });
  const page = await context.newPage();
  await page.goto(route);
  await page.addStyleTag({ content: ".agenda-steps > li::before { content: counter(step, decimal-leading-zero) !important; }" });
  const cdp = await context.newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree") as { nodes: { role?: { value?: string }; name?: { value?: string } }[] };
  const numbers = nodes.filter((node) => node.role?.value === "StaticText" && /^\d\d$/.test(node.name?.value ?? "")).map((node) => node.name!.value!);
  expect(numbers).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]);
  await context.close();
});

for (const width of [320, 390, 768, 1024, 1366]) {
  test(`DAX deep dive page reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const spills = await page.locator("main *").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0).map((el) => el.className || el.tagName));
      expect(spills).toEqual([]);
    }
  });
}

test("DAX deep dive page works from the keyboard without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? document.activeElement?.tagName ?? ""));
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(2);
  }
  expect(reached).toEqual(links.slice(0, 7));

  // The panel action lands on the form; the arrangements pointer leads to How I train's private course terms.
  await page.locator(".run-action").click();
  await expect(page).toHaveURL(baseURL! + route + "#contact");
  await expect(page.getByRole("form", { name: "Ask about dates" })).toBeInViewport();
  await page.getByRole("link", { name: "see the private course terms" }).click();
  await expect(page).toHaveURL(baseURL! + "/training/how-i-train/#private-courses");
  await expect(page.locator("#private-courses")).toBeInViewport();
  await context.close();
});

test("DAX deep dive enquiry keeps the shared plain-POST protections without depending on optional fields", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);
  const form = page.getByRole("form", { name: "Ask about dates" });
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", ENQUIRY.action!);
  await expect(form).toHaveAccessibleDescription(/^I use your details to reply to your enquiry/);
  await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute("required", "");
  await expect(form.getByLabel("Your message", { exact: true })).toHaveAttribute("required", "");
  await expect(form.getByLabel("Your message", { exact: true })).toHaveAttribute("aria-describedby", "enquiry-message-hint");
  await expect(form.locator('[name="_append"]')).toHaveValue("false");
  await expect(form.locator('[name="_redirect"]')).toHaveValue(ENQUIRY.successPath);
  await expect(form.locator('[name="_error"]')).toHaveValue(ENQUIRY.errorPath);
  await expect(form.locator('[name="_gotcha"]')).toBeHidden();
  await expect(page.locator("#contact .fallback a")).toHaveAttribute("href", email);
  await context.close();
});

visualReview(route, [[1366, 900], [390, 844], [1024, 900], [768, 900]]);
