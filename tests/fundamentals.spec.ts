import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, box, expectNoSpills, forEachTextSize, watchPage, agendaNumbers } from "./helpers";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";
import { priced, copy, expectItems, expectAttribute, expectAmountsOnlyWhenPriced, expectNone, expectAriaWithoutAmounts, priceOnRequest } from "./prices";

const route = "/training/power-bi-fundamentals/";
const email = "mailto:alan@burningsuit.co.uk";
// The decision hero's action comes first: it sits on the dark stage, above the introduction.
const links = ["#contact", "/training/dax-fundamentals/", "#need-title", "/training/how-i-train/", "/about/", "/training/how-i-train/#private-courses", ENQUIRY.privacyPath, email];


test("Fundamentals page stays static, private, price-safe and CSP-clean", async ({ page, baseURL }) => {
  const watch = await watchPage(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Power BI fundamentals | burningsuit");
  const baseDescription = "A two-day private course for teams new to Power BI: build an interactive report, prepare its data and learn how it's shared and kept up to date.";
  await expectAttribute(page.locator('meta[name="description"]'), "content", priced ? baseDescription : `${baseDescription} Price on request.`, "fundamentals description");
  await expectIndexable(page);
  await expect(page.locator(`${otherScripts}, astro-island`)).toHaveCount(0);
  // The only image is the parts-of-Power-BI diagram: described by its alt, captioned, with a text version a keyboard can open.
  await expect(page.locator("main img")).toHaveCount(1);
  const figure = page.locator("main figure.course-figure");
  await expect(figure.locator("img")).toHaveAttribute("alt", /^A map of Power BI\./);
  await expect(figure.locator("figcaption")).toContainText("you can tell where a problem sits");
  await expect(figure.locator("details summary")).toHaveText("Read the diagram as text");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content");
  for (const directive of ["default-src 'none'", "font-src 'self'", `form-action ${formActionSource}`]) expect(csp).toContain(directive);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("form")).toHaveCount(1);
  await expect(page.locator("nav a[aria-current]:not(.nav-menu a)")).toHaveText("Training");
  await expect(page.locator('.nav-menu a[aria-current="page"]')).toHaveText("Power BI fundamentals");
  // Private only: no public run, booking or payment route. Unpriced output says Price on request once; priced output shows the private rates and never that phrase.
  // The shared footer's "Booking terms" link is site furniture, not this page's wording.
  const body = (await page.locator("body").innerText()).replace(await page.locator("footer").innerText(), "");
  await expectAmountsOnlyWhenPriced(page, "fundamentals");
  if (!priced) expectNone(body, [/\d\s*(GBP|ex VAT)/i], "fundamentals unpriced");
  await expect(page.getByText(priceOnRequest, { exact: true })).toHaveCount(priced ? 0 : 1);
  await expect(page.locator("main button:not(.send), main time, main a[href*='stripe'], main a[href*='pay'], main a[href*='cal.com']")).toHaveCount(0);
  // "per booking" is the approved price unit; any other booking wording stays absent.
  expectNone(body.replaceAll("per booking", ""), [/seat/i, /book/i, /public/i, /free hour/i, /Windows/i, /setup check/i, /\[|\]|\{|\}/, /founding/i], "fundamentals text");
  await expect(page.locator(".outcomes figure.pull-quote figcaption")).toHaveText("Assistant accountant, Power BI fundamentals");
  watch.expectClean();
});

test("Fundamentals page renders the approved wording, gaps and question order", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to page and test together.
  await expect(page.locator("h1")).toHaveText("Power BI fundamentals");
  await expect(page.locator(".title-band .standfirst")).toHaveText("New to Power BI?");
  await expect(page.locator(".course-intro > p:not(.standfirst):not(.course-fit)")).toHaveText("This two-day course takes your team from preparing data to sharing reports and keeping them up to date. No Power BI experience, DAX or coding needed.");
  await expect(page.locator(".course-fit")).toHaveText("Already building reports and looking for a day on calculations? See DAX fundamentals.");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you'll be able to do", "The two days", "What to arrange", "Ask about dates"]);

  // Decision hero: the facts and the one primary action sit in the title band on the dark stage, after the standfirst and
  // before the introduction; no separate facts card remains. The price comes last, on its own line, in reading order too.
  // Priced output omits "On site or online" (the price item names both) and carries amounts, so it is checked by in-memory text rather than an ARIA snapshot.
  const hero = page.locator(".dark.stage .title-band.decision-hero");
  await expect(hero).toHaveCount(1);
  expect(await hero.evaluate((el) => [...el.children].map((child) => child.tagName + (child.className ? "." + child.className : "")))).toEqual(["H1", "P.standfirst", "SECTION.hero-facts"]);
  const group = page.getByRole("region", { name: "Course facts" });
  await expect(group).toHaveCount(1);
  await expect(hero.locator("section.hero-facts")).toHaveAttribute("aria-label", "Course facts");
  await expect(page.locator(".course-run")).toHaveCount(0);
  expect(await group.evaluate((el) => [...el.children].map((child) => child.className))).toEqual(["run-facts", "button run-action"]);
  const facts = group.locator(".run-facts");
  await expectItems(facts.locator("> li"), copy
    ? ["2 days", "Private, for your team", "Up to 8 people", "9:30am to 4pm each day", copy.fundamentalsDetail]
    : ["2 days", "Private, for your team", "On site or online", "Up to 8 people", "9:30am to 4pm each day", priceOnRequest], "fundamentals facts");
  await expect(facts.locator("> li.fact-price")).toHaveCount(1);
  await expect(facts.locator("> li").last()).toHaveClass("fact-price");
  if (!priced) await expectAriaWithoutAmounts(facts, `
    - list:
      - listitem: 2 days
      - listitem: Private, for your team
      - listitem: On site or online
      - listitem: Up to 8 people
      - listitem: 9:30am to 4pm each day
      - listitem: Price on request
  `);
  await expect(page.locator(".run-action")).toHaveCount(1);
  await expect(group.locator(".button.run-action")).toHaveText("Ask about dates");
  await expect(group.locator(".button.run-action")).toHaveAttribute("href", "#contact");
  // The introduction opens the daylight sheet on its own, outside the dark stage.
  await expect(page.locator(".dark.stage .course-intro")).toHaveCount(0);
  await expect(page.locator(".course-opening.decision-opening > *")).toHaveCount(1);

  // Outcomes are ruled, not a second numbered sequence.
  await expect(page.locator(".outcomes ol")).toHaveCount(0);
  await expect(page.locator(".outcomes .need-list > li")).toHaveText([
    "Build an interactive report and check how filters change its numbers.",
    "Clean and reshape data in Power Query, so the steps run again when the data changes.",
    "Connect several tables in a semantic model: the tables, relationships and calculations behind a report.",
    "Publish and share a report, knowing who can see it and what keeps its data current.",
    "Identify which part of Power BI a problem sits in, and use its vocabulary to find help.",
  ]);

  // Practice: two sentences lead the agenda; the exercises sentence opens its body, immediately before Day 1.
  await expect(page.locator(".agenda .do-lead p")).toHaveText("I explain and demonstrate using prepared teaching data. You build and practise, with time for questions.");
  expect(await page.locator(".agenda .do-body > *").evaluateAll((els) => els.slice(0, 2).map((el) => el.textContent))).toEqual(["Exercises include recreating a visual and building a report page.", "Day 1: from an Excel table to a shared report"]);

  // Both day groups continue one 01–09 sequence, visually and for assistive technology.
  await expect(page.locator(".agenda .day-title")).toHaveText(["Day 1: from an Excel table to a shared report", "Day 2: what sits underneath"]);
  const steps = page.locator(".agenda-steps > li");
  await expect(steps).toHaveCount(9);
  await expect(page.locator(".agenda-steps").nth(1)).toHaveAttribute("start", "5");
  await expect(steps.locator("strong")).toHaveText(["Build a first report", "Make it useful to its reader:", "Get it in front of people:", "Prepare data you can use again", "Build a report page:", "Bring tables together:", "Meet DAX,", "Distribute and maintain it:", "Copilot in Power BI, briefly:"]);
  await expect(steps.nth(2)).toContainText("publishing to the Power BI service, sharing, subscriptions, comments, dashboards and a second report from the published model. See publishing arrangements.");
  await expect(steps.nth(2).getByRole("link", { name: "publishing arrangements" })).toHaveAttribute("href", "#need-title");
  // The learner's own measure stays conditional; Copilot is awareness only.
  await expect(steps.nth(6)).toHaveText("Meet DAX, Power BI's formula language. I demonstrate a simple measure, a calculation responding to filters. You may write one, depending on the group's progress.");
  await expect(steps.nth(8)).toHaveText("Copilot in Power BI, briefly: what it can help with, why access varies and what to check. No exercise depends on it.");
  await expect(page.locator(".agenda")).toMatchAriaSnapshot(`
    - heading /^Day 1/ [level=3]
    - list /^Day 1/:
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
  `);
  // Ordered-list semantics: the second list's first item is item 5.
  expect(await steps.nth(4).evaluate((li) => (li.parentElement as HTMLOListElement).start)).toBe(5);

  // One teacher card below the spine; biography and philosophy link out.
  await expect(page.locator(".trust-teacher p")).toHaveText("I'm Alan Harman-Box, and I write and teach every course myself. I've taught this course to about 300 people.");
  await expect(page.locator(".trust-teacher a")).toHaveText(["How I train", "More about me"]);
  // The 101's "Who's teaching" card, heading included, at the agenda's subheading level.
  await expect(page.getByRole("heading", { level: 3, name: "Who's teaching" })).toHaveCount(1);

  // Dates, setup, takeaways and the company-data point now live in How I train's private course terms (approved amendment, 7 Nov):
  // a pointer comes first, then only this course's licence and publishing points.
  await expect(page.locator("#need-title")).toHaveText("What to arrange");
  const pointer = page.locator(".course-need:not(.outcomes) .need-pointer");
  await expect(pointer).toHaveText("For dates, setup, payment and cancelling, see the private course terms.");
  await expect(pointer.getByRole("link", { name: "see the private course terms" })).toHaveAttribute("href", "/training/how-i-train/#private-courses");
  expect(await page.locator(".course-need:not(.outcomes) .need-body > *").evaluateAll((els) => els.map((el) => el.className))).toEqual(["need-pointer", "need-list"]);
  const needs = page.locator(".course-need:not(.outcomes) .need-list > li");
  await expect(needs).toHaveText([
    "On site licences: I provide and manage them.",
    "Online licences: you arrange your own. A Power BI Pro licence is ideal, but most of the course works with a free licence.",
    "Publishing practice depends on licences and access.",
  ]);
  await expect(page.locator(".need-note, .keep")).toHaveCount(0);
  await expect(page.locator(".to-confirm")).toHaveCount(0);

  await expect(page.locator(".enquiry-intro p")).toHaveText("Tell me you're interested in Power BI fundamentals, how many people would come and roughly when.");
  await expect(page.locator("#contact .fallback")).toHaveText("Or email alan@burningsuit.co.uk.");
  const mainLinks = await page.locator("main a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(mainLinks).toEqual(links);
});

test("Fundamentals layout: one decision group on the dark stage, the introduction below it on the daylight sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  const stage = await box(page, ".dark.stage");
  let standfirst = await box(page, ".title-band .standfirst"), group = await box(page, ".hero-facts"), action = await box(page, ".run-action"), intro = await box(page, ".course-intro");
  expect(group.y).toBeGreaterThanOrEqual(standfirst.y + standfirst.height);
  expect(group.y + group.height).toBeLessThanOrEqual(stage.y + stage.height);
  expect(intro.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
  // Everything needed to decide, including the action, is in the first screen.
  await expect(page.locator(".run-action")).toBeInViewport({ ratio: 1 });
  // Wide screens: the non-price facts share one line; the price takes its own line beneath, then the action.
  const factBoxes = await page.locator(".hero-facts .run-facts > li").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, price: el.classList.contains("fact-price") }; }));
  const line = factBoxes.filter((f) => !f.price), price = factBoxes.find((f) => f.price)!;
  for (const fact of line) expect(Math.abs(fact.top - line[0].top)).toBeLessThanOrEqual(1);
  expect(price.top).toBeGreaterThanOrEqual(Math.max(...line.map((f) => f.bottom)));
  expect(action.y).toBeGreaterThanOrEqual(price.bottom);
  // The hero keeps the shared heading scale and the one button: the same title size as another course's TitleBand and the
  // same button as the homepage's dark title band.
  const titleSize = await page.locator(".title-band h1").evaluate((el) => getComputedStyle(el).fontSize);
  const button = await page.locator(".run-action").evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.fontSize, s.borderRadius]; });
  await page.goto("/training/dax-fundamentals/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator(".title-band h1").evaluate((el) => getComputedStyle(el).fontSize)).toBe(titleSize);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const stageButton = await page.locator(".title-band .title-actions .button").first().evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.fontSize, s.borderRadius]; });
  expect(button).toEqual(stageButton);
  await page.goto(route);
  // The agenda is the page's raised band; outcomes and arrangements sit on the ground.
  const bg = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(".agenda")).not.toBe(await bg("body"));
  for (const selector of [".outcomes", "section[aria-labelledby='need-title']"]) expect(await bg(selector)).toBe("rgba(0, 0, 0, 0)");
  // The introduction now opens the daylight sheet, so its specialist pointer carries the daylight warm accent (the
  // same ochre as the need-list markers), not the link colour; amber stays on the dark title band.
  const amber = await page.locator(".title-band").evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim());
  const ochre = await page.locator(".need-list > li").first().evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  expect(await page.locator(".course-fit").evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(ochre);
  // On the daylight agenda band the step numbers take the daylight link colour, not amber (1.9:1 there).
  const daylightLink = await page.locator(".trust-teacher a").first().evaluate((el) => getComputedStyle(el).color);
  expect(daylightLink).not.toBe(ochre);
  expect(amber).not.toBe("");
  expect(await page.locator(".agenda-steps > li").first().evaluate((el) => getComputedStyle(el, "::before").color)).toBe(daylightLink);
  // On wide screens the two days run side by side.
  const [day1, day2] = [await box(page, "#day-1-title"), await box(page, "#day-2-title")];
  expect(day2.x).toBeGreaterThanOrEqual(day1.x + day1.width);
  expect(Math.abs(day1.y - day2.y)).toBeLessThanOrEqual(1);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    standfirst = await box(page, ".title-band .standfirst"); group = await box(page, ".hero-facts"); action = await box(page, ".run-action"); intro = await box(page, ".course-intro");
    expect(group.y).toBeGreaterThanOrEqual(standfirst.y + standfirst.height);
    expect(intro.y).toBeGreaterThanOrEqual(group.y + group.height);
    expect((await box(page, ".outcomes")).y).toBeGreaterThanOrEqual(intro.y + intro.height);
    // Phones: the facts pair up in two columns, the price spans both, and the action spans the content width.
    const price = await box(page, ".fact-price"), first = await box(page, ".run-facts > li:first-child");
    expect(price.width).toBeGreaterThan(first.width * 1.5);
    expect(Math.abs(action.width - group.width)).toBeLessThanOrEqual(1);
    if (width === 390) await expect(page.locator(".run-action")).toBeInViewport({ ratio: 1 });
    // Steps, tags and links stay inside the viewport.
    for (const selector of [".agenda-steps", ".need-list", ".run-facts", ".run-facts > li", ".run-action"]) {
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

test("the agenda's visible numbers run 01 to 09 across both days", async ({ page }) => {
  await page.goto(route);
  // Read from the page's own computed counters; the numbers are decorative (alt text ""), so they stay out of the accessibility tree.
  expect(await agendaNumbers(page)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09"]);
});

for (const width of [320, 390, 768, 1024, 1366]) {
  test(`Fundamentals page reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await forEachTextSize(page, async () => {
      await expectNoSpills(page);
    });
  });
}

test("Fundamentals page works from the keyboard without JavaScript", async ({ browser, baseURL }) => {
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
  // The diagram's text-version toggle sits between the opening's links and the agenda's.
  expect(reached).toEqual([...links.slice(0, 2), "SUMMARY", ...links.slice(2, 6)]);

  // The agenda link lands on the arrangements heading; the panel action lands on the form.
  await page.locator('a[href="#need-title"]').click();
  await expect(page).toHaveURL(baseURL! + route + "#need-title");
  await expect(page.locator("#need-title")).toBeInViewport();
  await page.locator(".run-action").click();
  await expect(page).toHaveURL(baseURL! + route + "#contact");
  await expect(page.getByRole("form", { name: "Ask about dates" })).toBeInViewport();
  await context.close();
});

test("Fundamentals enquiry keeps the shared plain-POST protections without depending on optional fields", async ({ browser, baseURL }) => {
  // Shared delivery/validation journeys belong to the component's own tests.
  // This page stays compatible with the approved simpler form when Contact is integrated.
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
