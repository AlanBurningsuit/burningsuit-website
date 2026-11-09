import { type Page } from "@playwright/test";
import { test, expect, isTracker, otherScripts } from "./analytics";
import { reportCspViolations, visualReview, expectIndexable } from "./helpers";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";
import { redirects } from "../src/config/compatibility.mjs";
import { priced, copy, expectItems, expectAttribute, expectAmountsOnlyWhenPriced, expectNone, expectAriaWithoutAmounts, priceOnRequest } from "./prices";

// Approved wording: ops site/dax-fundamentals-page-copy.md, candidate 6 (8 Nov 2026). Pinned on purpose: changing it needs Alan's approval.
const route = "/training/dax-fundamentals/";
const email = "mailto:alan@burningsuit.co.uk";
// The decision hero's action comes first: it sits on the dark stage, above the introduction.
const links = ["#contact", "/training/power-bi-fundamentals/", "/training/", "/training/how-i-train/", "/about/", "/training/how-i-train/#private-courses", ENQUIRY.privacyPath, email];
const demonstrated = "Demonstrated, not practised.";

const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;

test("DAX fundamentals page stays static, private, price-safe and CSP-clean", async ({ page, baseURL }) => {
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
  await expect(page).toHaveTitle("DAX fundamentals | burningsuit");
  const baseDescription = "A one-day private course for teams who build reports in Power BI but haven't written DAX yet: learn why a measure returns the number it does, and when to use a measure instead of a calculated column.";
  await expectAttribute(page.locator('meta[name="description"]'), "content", priced ? baseDescription : `${baseDescription} Price on request.`, "DAX fundamentals description");
  await expectIndexable(page);
  await expect(page.locator(`${otherScripts}, astro-island, [data-rebuild-placeholder]`)).toHaveCount(0);
  // No portrait, figure or diagram: the brief allows none.
  await expect(page.locator("main img, main figure, main svg")).toHaveCount(0);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
  for (const directive of ["default-src 'none'", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("form")).toHaveCount(1);
  await expect(page.locator("nav a[aria-current]:not(.nav-menu a)")).toHaveText("Training");
  await expect(page.locator('.nav-menu a[aria-current="page"]')).toHaveText("DAX fundamentals");
  // Private only: no public run, booking or payment route. Unpriced output says Price on request once; priced output shows the private rates and never that phrase.
  // The shared footer's "Booking terms" link is site furniture, not this page's wording.
  const body = (await page.locator("body").innerText()).replace(await page.locator("footer").innerText(), "");
  await expectAmountsOnlyWhenPriced(page, "DAX fundamentals");
  if (!priced) expectNone(body, [/\d\s*(GBP|ex VAT)/i], "DAX fundamentals unpriced");
  await expect(page.getByText(priceOnRequest, { exact: true })).toHaveCount(priced ? 0 : 1);
  await expect(page.locator("main button:not(.send), main time, main a[href*='stripe'], main a[href*='pay'], main a[href*='cal.com']")).toHaveCount(0);
  // No quote, rating, count or case study; no "next step", bundle or prerequisite framing. The teaching-data name is kept out of tracked source, so it isn't asserted here.
  // Alan approved the delivery-history line (8 Nov 2026); it names past public courses, not a public run of this one.
  expectNone(body.replaceAll("per booking", "").replace("I've run this day for public-sector teams, and on public courses, since 2022.", ""), [/seat/i, /book/i, /public/i, /founding/i, /free call/i, /next step/i, /prerequisite/i, /half/i, /out of 5|responses|praised/i, /★|☆/, /\[|\]|\{|\}/, /—/], "DAX fundamentals text");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("DAX fundamentals page names and links to no study or other course page outside the Training menu, beyond its fit-line pointers", async ({ page }) => {
  await page.goto(route);
  // The whole document (text, attributes, head), without the shared Training menu and the site-wide structured data.
  const html = await page.evaluate(() => {
    const doc = document.documentElement.cloneNode(true) as HTMLElement;
    doc.querySelectorAll(".nav-menu, script[type='application/ld+json']").forEach((el) => el.remove());
    return doc.outerHTML;
  });
  for (const other of [/deep dive/i, /data modelling/i, /agents 101/i]) expect(other.test(html), `names no other course: ${other}`).toBe(false);
  const courseLinks = await page.locator('main a[href^="/training/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(courseLinks.filter((href) => !["/training/", "/training/power-bi-fundamentals/", "/training/how-i-train/#private-courses", "/training/how-i-train/"].includes(href ?? ""))).toEqual([]);
  // No study link of any kind.
  await expect(page.locator(".study-evidence, main a[href^='/work/']")).toHaveCount(0);
});

test("DAX fundamentals page renders the approved wording and question order", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("DAX fundamentals");
  await expect(page.locator("h1 .em")).toHaveText("fundamentals");
  await expect(page.locator(".title-band .standfirst")).toHaveText("Building reports in Power BI, and ready to write your own measures?");
  const opening = page.locator(".course-intro > p:not(.standfirst):not(.course-fit)");
  await expect(opening).toHaveText("Start writing DAX with a clear idea of what it's doing. A one-day course for people who build reports in Power BI and haven't written DAX yet. You'll learn why a measure returns the number it does, and when to use a measure instead of a calculated column.");
  await expect(opening.locator("strong")).toHaveText("Start writing DAX with a clear idea of what it's doing.");
  const fit = page.locator(".course-fit");
  await expect(fit).toHaveText("If you haven't built a report yet, it's too early: start with Power BI fundamentals, or compare all the courses.");
  await expect(fit.getByRole("link", { name: "Power BI fundamentals" })).toHaveAttribute("href", "/training/power-bi-fundamentals/");
  await expect(fit.getByRole("link", { name: "compare all the courses" })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you'll be able to do", "The day", "What to arrange", "Ask about dates"]);

  // Priced output omits "On site or online" (the price item names both) and carries amounts, so it is checked by in-memory text rather than an ARIA snapshot.
  const facts = page.getByRole("complementary", { name: "Course facts" }).locator(".run-facts");
  await expectItems(page.locator(".hero-facts .run-facts > li"), copy
    ? ["1 day", "Private, for your team", "Up to 8 people", "9:30am to 4pm", copy.daxFundamentalsDetail]
    : ["1 day", "Private, for your team", "On site or online", "Up to 8 people", "9:30am to 4pm", priceOnRequest], "DAX fundamentals facts");
  if (!priced) await expectAriaWithoutAmounts(facts, `
    - list:
      - listitem: 1 day
      - listitem: Private, for your team
      - listitem: On site or online
      - listitem: Up to 8 people
      - listitem: 9:30am to 4pm
      - listitem: Price on request
  `);
  await expect(page.locator(".run-action")).toHaveText("Ask about dates");
  await expect(page.locator(".run-action")).toHaveAttribute("href", "#contact");

  // Outcomes are ruled, not a second numbered sequence.
  await expect(page.locator(".outcomes ol")).toHaveCount(0);
  await expect(page.locator(".outcomes .need-list > li")).toHaveText([
    "Trace the number a measure gives you back to the filters that produced it, and to the row context inside it. That includes how filters travel along the relationships in a star schema (one table of events, such as sales or visits, with lookup tables around it for dates, products and places).",
    "Add calculated columns, and say when a measure or Power Query would do the job better.",
    "Write measures with SUM, COUNTROWS and DISTINCTCOUNT. Use SUMX and the other iterators, which work row by row, where you might otherwise add a calculated column.",
    "Change what a measure includes with CALCULATE, using simple filters, FILTER and ALL, for example to compare each value with the overall total.",
  ]);

  // How it runs: the lead only; no exercises line, figure or day groups.
  await expect(page.locator(".agenda .do-lead p")).toHaveText("You'll work on data prepared for teaching: I explain and demonstrate, then you write columns and measures yourself in exercises, with time for questions. Online has the same content and exercises.");
  await expect(page.locator(".agenda .exercises, .agenda .day-title, .agenda h3, .course-figure")).toHaveCount(0);

  // One sequence, 01 to 05.
  await expect(page.locator(".agenda-steps")).toHaveCount(1);
  const steps = page.locator(".agenda-steps > li");
  await expect(steps).toHaveText([
    "What DAX works on: the tables in your model, which ones hold events and which ones describe them, and why that shape makes formulas easier to write. We look at the model only as far as DAX needs it.",
    "Your first columns and measures: how a DAX formula is put together, the totals Power BI works out for you without a formula (implicit measures), measures you write yourself with SUM, COUNTROWS and DISTINCTCOUNT, and RELATED to bring in a value from a lookup table.",
    "Which rows a calculation sees: row context and filter context, and how SUMX and the other iterators work through a table one row at a time inside a measure, so a calculated column is seldom the answer.",
    `Measures that respond to slicers: SELECTEDVALUE to read a single choice, and a parameter table so someone viewing the report can change which calculation a visual shows. ${demonstrated}`,
    "Changing the filters with CALCULATE: start with simple true/false conditions, then add your own with FILTER and clear existing ones with ALL, until you can show each value as a share of the total.",
  ]);
  await expect(steps.locator("strong")).toHaveText(["What DAX works on:", "Your first columns and measures:", "Which rows a calculation sees:", "Measures that respond to slicers:", "Changing the filters with CALCULATE:"]);
  // The demonstrated tag marks item 04 only, as a quiet label at the end of the item.
  const tagged = await steps.evaluateAll((items) => items.map((li, i) => (li.querySelector(".demo-tag") ? i + 1 : 0)).filter(Boolean));
  expect(tagged).toEqual([4]);
  await expect(page.locator(".demo-tag")).toHaveText([demonstrated]);
  expect(await page.locator(".demo-tag").evaluateAll((els) => els.every((el) => el === el.parentElement!.lastElementChild))).toBe(true);
  await expect(page.locator(".agenda")).toMatchAriaSnapshot(`
    - list "The day":
      - listitem
      - listitem
      - listitem
      - listitem
      - listitem
  `);

  // One teacher line below the spine, then the one proof line: no study link, quote, rating or count.
  await expect(page.locator(".teacher-line p")).toHaveText("I'm Alan Harman-Box, and I write and teach every course myself.");
  await expect(page.locator(".teacher-line a")).toHaveText(["How I train", "More about me"]);
  await expect(page.locator(".proof-line")).toHaveText("I've run this day for public-sector teams, and on public courses, since 2022.");
  await expect(page.locator(".course-proof > *")).toHaveCount(1);
  await expect(page.locator("main blockquote, main .case-figures, .study-evidence")).toHaveCount(0);

  // What to arrange: one pointer line to How I train's private course terms; no list or keep paragraph.
  await expect(page.locator("#need-title")).toHaveText("What to arrange");
  const need = page.locator("section[aria-labelledby='need-title']");
  await expect(need.locator(".need-body > *")).toHaveCount(1);
  await expect(need.locator(".need-pointer")).toHaveText("For dates, setup, payment and cancelling, see the private course terms.");
  await expect(need.getByRole("link", { name: "see the private course terms" })).toHaveAttribute("href", "/training/how-i-train/#private-courses");
  await expect(need.locator("ul, .keep, .need-note")).toHaveCount(0);
  await expect(page.locator(".to-confirm")).toHaveCount(0);

  await expect(page.locator(".enquiry-intro p")).toHaveText("Tell me you're interested in DAX fundamentals, how many people would come and roughly when.");
  await expect(page.locator("#contact .fallback")).toHaveText("Or email alan@burningsuit.co.uk.");
  const mainLinks = await page.locator("main a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(mainLinks).toEqual(links);
});

test("the old DAX fundamentals course URL redirects to the DAX fundamentals page", async ({ page, baseURL }) => {
  const legacy = "/fully-flexible-training-dax-skills/our-courses-power-bi-training/10-power-bi-dax-fundamentals";
  expect((redirects as Record<string, string>)[legacy]).toBe(route);
  await page.goto(legacy);
  await expect(page).toHaveURL(baseURL + route);
  await expect(page.locator("h1")).toHaveText("DAX fundamentals");
  // No other legacy URL leads here.
  expect(Object.entries(redirects).filter(([, to]) => to === route).map(([from]) => from)).toEqual([legacy]);
});

test("DAX fundamentals layout: facts and action in the decision hero, above the introduction at every width", async ({ page }) => {
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
  // On wide screens the single sequence sits under the lead, aligned with it, wider than a day column would be; the teacher line follows it.
  const lead = await box(page, ".agenda .do-lead"), list = await box(page, ".agenda-steps"), inner = await box(page, ".agenda .do-inner");
  expect(list.y).toBeGreaterThanOrEqual(lead.y + lead.height);
  expect(Math.abs(list.x - lead.x)).toBeLessThanOrEqual(1);
  expect(list.width).toBeGreaterThan(inner.width * 0.6);
  expect((await box(page, ".teacher-line")).y).toBeGreaterThanOrEqual(list.y + list.height);

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

test("the agenda's visible numbers run 01 to 05", async ({ browser, baseURL }) => {
  // The numbers are decorative (alt text ""), so a test-only style exposes the same counter to Chromium's accessibility tree.
  const context = await browser.newContext({ baseURL, bypassCSP: true });
  const page = await context.newPage();
  await page.goto(route);
  await page.addStyleTag({ content: ".agenda-steps > li::before { content: counter(step, decimal-leading-zero) !important; }" });
  const cdp = await context.newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree") as { nodes: { role?: { value?: string }; name?: { value?: string } }[] };
  const numbers = nodes.filter((node) => node.role?.value === "StaticText" && /^\d\d$/.test(node.name?.value ?? "")).map((node) => node.name!.value!);
  expect(numbers).toEqual(["01", "02", "03", "04", "05"]);
  await context.close();
});

for (const width of [320, 390, 768, 1024, 1366]) {
  test(`DAX fundamentals page reflows at ${width}px with enlarged text`, async ({ page }) => {
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

test("DAX fundamentals page works from the keyboard without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? document.activeElement?.tagName ?? ""));
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(2);
  }
  expect(reached).toEqual(links.slice(0, 6));

  // The panel action lands on the form; the arrangements pointer leads to How I train's private course terms.
  await page.locator(".run-action").click();
  await expect(page).toHaveURL(baseURL! + route + "#contact");
  await expect(page.getByRole("form", { name: "Ask about dates" })).toBeInViewport();
  await page.getByRole("link", { name: "see the private course terms" }).click();
  await expect(page).toHaveURL(baseURL! + "/training/how-i-train/#private-courses");
  await expect(page.locator("#private-courses")).toBeInViewport();
  await context.close();
});

test("DAX fundamentals enquiry keeps the shared plain-POST protections without depending on optional fields", async ({ browser, baseURL }) => {
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
