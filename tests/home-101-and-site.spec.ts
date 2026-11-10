import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, box, forEachTextSize, watchPage } from "./helpers";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";
import { copy, expectOnlyTrackedAmounts, expectNone, expectSeatBooking } from "./prices";
import { RUN } from "../src/config/course-run.mjs";

const course = "/training/power-bi-with-ai-agents-101/";

for (const route of ["/", course]) {
  test(`built page stays static, private and CSP-clean: ${route}`, async ({ page, baseURL }) => {
    const watch = await watchPage(page);
    expect((await page.goto(route))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const loadedFonts = await page.evaluate(() => Array.from(document.fonts).filter((font) => font.status === "loaded").map((font) => font.family));
    for (const family of ["Mona Sans", "Albert Sans", "Burningsuit Reader"]) expect(loadedFonts.some((font) => font.startsWith(family))).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    await expectIndexable(page);
    await expect(page.locator(`${otherScripts}, astro-island`)).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(route === "/" ? 1 : 0);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link")).toHaveText(["Training", "Consultancy", "Case studies", "About", "Contact"]);
    expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).textTransform)).toBe("none");
    expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain(`form-action ${formActionSource}`);
    await expectOnlyTrackedAmounts(page, `static page ${route}`);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    // Beside Training, a disclosure lists the course pages; closed by default, it opens without JavaScript.
    const courses = page.locator(".nav-menu");
    await expect(courses.locator("summary")).toHaveAccessibleName("Training courses");
    await expect(courses).not.toHaveAttribute("open", /.*/);
    await courses.locator("summary").click();
    await expect(courses.getByRole("link")).toHaveText(["Power BI fundamentals", "Power BI with AI agents 101", "DAX fundamentals", "DAX deep dive", "How I train"]);
    await courses.locator("summary").click();
    watch.expectClean();
  });

  for (const width of [320, 390, 768, 1366]) {
    test(`page reflows at ${width}px with enlarged text: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 768 });
      await page.goto(route);
      await forEachTextSize(page);
    });
  }

  visualReview(route);
}

test("the 101 follows the visitor questions, keeps booking closed and open setup facts visible", async ({ page }) => {
  await page.goto(course);
  await expect(page.locator('nav a[aria-current]:not(.nav-menu a)')).toHaveText("Training");
  await expect(page.locator('.nav-menu a[aria-current="page"]')).toHaveText("Power BI with AI agents 101");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you'll do", "How you'll check its answers", "What you'll need", "Book a seat"]);
  await expect(page.locator(".do-steps > li")).toHaveCount(4);
  await expect(page.locator(".do-steps h3")).toHaveText(["Get your bearings.", "Understand a report you didn't build.", "Document its calculations.", "Build one new calculation and check it."]);
  await expect(page.getByRole("heading", { level: 3, name: "Who's teaching" })).toBeVisible();
  await expect(page.locator(`time[datetime="${RUN.date}"]`)).toHaveText([RUN.longDate, RUN.longDate]);
  // Seat rates; the private course has no price item on this page.
  await expect(page.locator(".hero-facts .run-facts > li")).toHaveText(["Half a day, live online", `${RUN.longDate}, ${RUN.times}`, RUN.people, ...copy.seatFacts]);
  await expect(page.locator(".book-facts")).toHaveText(`${RUN.longDate}, ${RUN.times}, ${RUN.modeText}. ${RUN.people}. ${copy.seatBookFacts}`);

  // Booking: the Stripe link.
  await expectSeatBooking(page);
  await expect(page.locator("main form, main a[href*='pay']:not([href*='buy.stripe.com']), main a[href^='/contact'], main a[href='#contact']")).toHaveCount(0);

  // Email is the private-course and invoice route; How I train is the one teaching-method link.
  // The address is literal on purpose: a wrong config value must fail here.
  await expect(page.getByRole("link", { name: "Ask about a private course." })).toHaveAttribute("href", "mailto:alan@burningsuit.co.uk");
  await expect(page.getByRole("link", { name: /private/i })).toHaveCount(1);
  await expect(page.locator(".invoice a")).toHaveAttribute("href", "mailto:alan@burningsuit.co.uk");
  await expect(page.locator(".invoice")).toContainText("Invoices are due within 30 days.");
  // The booking band repeats the setup line from the top of the page, so nobody pays before checking they can take part.
  await expect(page.locator(".course-book .book-before")).toHaveText("Before you book: you'll need a Windows computer, a paid plan on Claude Desktop, ChatGPT or GitHub Copilot, and permission to install it. See what you'll need.");
  await expect(page.locator(".booking-terms li").last()).toHaveText("If I have to cancel for any other reason, you get a full refund.");
  await expect(page.getByRole("link", { name: "How I train" })).toHaveAttribute("href", "/training/how-i-train/");
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  // The two Stripe booking links, in reading order beside each "Book a seat".
  const { SEAT_BOOKING_URL } = await import("../src/config/booking.mjs");
  expect(mainLinks).toEqual(["#need-title", SEAT_BOOKING_URL, "mailto:alan@burningsuit.co.uk", "/training/how-i-train/", "/writing/we-are-all-middle-management-now/", "/privacy/#recordings", "#need-title", SEAT_BOOKING_URL, "mailto:alan@burningsuit.co.uk"]);

  // The setup facts are settled (Alan, 7 Nov 2026): no open "to confirm" gaps remain.
  const needs = page.locator(".need-list > li");
  await expect(needs).toHaveText([
    "A Windows computer with a version of Power BI Desktop released in the 3 months before the course.",
    "One of three agent tools, on at least its lowest paid plan: Claude Desktop, ChatGPT or GitHub Copilot. Using something else? Tell me, and we can probably make it work.",
    "Permission to install and use that tool. On a work laptop, check with your IT team early. If your work laptop is locked down, you can use your own Windows computer.",
    "A folder on your computer for the teaching files, outside OneDrive and SharePoint, plus reliable internet and audio. A second screen helps.",
    "A short setup check before the day. You'll get the details with your course information once your booking is confirmed.",
  ]);
  await expect(page.locator(".to-confirm")).toHaveCount(0);

  // The deciding opening and trust sentences, and the step sequence as a list for assistive technology.
  await expect(page.locator(".title-band .standfirst")).toHaveText("Want to be ready for where Power BI is going?");
  await expect(page.locator(".course-fit")).toHaveText("If you've built a report in Power BI Desktop, even a simple one, you're ready. No coding or AI experience needed. If you already use coding agents on Power BI work every day, this covers ground you know.");
  await expect(page.locator(".trust-check p")).toHaveText("An agent can sound sure of itself and still be wrong. You learn to check its work against numbers you can confirm, correct it with evidence and go back to a clean copy when you need to. Deciding whether an answer is right stays with you.");
  await expect(page.locator(".trust-teacher p")).toHaveText("I'm Alan Harman-Box. I've spent about five years working with organisations as they adopt Power BI. I've used coding agents on Power BI since before they could write DAX. Now they're better than me on a good day, so it's time to show other people how it's done, including how to check their work.");
  await expect(page.locator(".do-steps")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "Get your bearings." [level=3]
        - paragraph
      - listitem:
        - heading "Understand a report you didn't build." [level=3]
        - paragraph
      - listitem:
        - heading "Document its calculations." [level=3]
        - paragraph
      - listitem:
        - heading "Build one new calculation and check it." [level=3]
        - paragraph
  `);
  await expect(page.locator(".run-facts").getByRole("listitem")).toHaveCount(6);
  const text = await page.locator("main").innerText();
  expectNone(text, [/\[|\]/, /gap/i, /showcase/i, /If plans change/i, /barely write DAX/i, /checklist/i, /house-rules template/i, /setup notes/i], "101 text");
  // "Founding rate" is the approved wording for the seat facts, stated as a plain fact.
  expect(text).toMatch(/founding rate/);
  expectNone(text, [/limited|save|early bird|discount|countdown/i], "101 founding rate");
  await expect(page.locator(".keep")).toHaveText("Afterwards, you keep a video recording of the morning, along with the teaching project and clean copies, so you can work through it again. How recordings work.");
});

test("the 101 puts facts, Before you book and booking in the decision hero, above the introduction at every width", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(course);
  // One group on the dark stage: facts, then the requirements line, then booking, then the private-course ask.
  const group = page.getByRole("region", { name: "Course facts and booking", exact: true });
  expect(await group.evaluate((el) => [...el.children].map((child) => child.className))).toEqual(["run-facts", "before-book", "booking", "private-ask"]);
  await expect(page.locator(".dark.stage .hero-facts .before-book")).toHaveText("Before you book: you'll need a Windows computer, a paid plan on Claude Desktop, ChatGPT or GitHub Copilot, and permission to install it. See what you'll need.");
  await expect(group.locator(".booking .book-button")).toHaveCount(1);
  let intro = await box(page, ".course-intro"), facts = await box(page, ".hero-facts");
  expect(intro.y).toBeGreaterThanOrEqual(facts.y + facts.height);
  // The requirements line is read before the booking control.
  expect((await box(page, ".hero-facts .booking")).y).toBeGreaterThanOrEqual((await box(page, ".hero-facts .before-book")).y + (await box(page, ".hero-facts .before-book")).height);
  const [check, teacher] = [await box(page, ".trust-check"), await box(page, ".trust-teacher")];
  expect(teacher.x).toBeGreaterThanOrEqual(check.x + check.width);


  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    intro = await box(page, ".course-intro"); facts = await box(page, ".hero-facts");
    expect(intro.y).toBeGreaterThanOrEqual(facts.y + facts.height);
    expect((await box(page, ".course-do")).y).toBeGreaterThanOrEqual(intro.y + intro.height);
    const [narrowCheck, narrowTeacher] = [await box(page, ".trust-check"), await box(page, ".trust-teacher")];
    expect(narrowTeacher.y).toBeGreaterThanOrEqual(narrowCheck.y + narrowCheck.height);
    // Steps, tags and the booking control stay inside the viewport.
    for (const selector of [".do-steps", ".need-list", ".book-button", ".hero-facts .run-facts > li", ".before-book", ".private-ask"]) {
      for (const item of await page.locator(selector).all()) {
        const b = (await item.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
      }
    }
  }
});

test("course discovery, facts and email routes work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("article", { name: "Power BI with AI agents 101" }).getByRole("link", { name: "Read the course outline" }).click();
  await expect(page).toHaveURL(baseURL! + course);
  await expect(page.getByRole("heading", { name: "Power BI with AI agents 101", exact: true })).toBeVisible();
  await expect(page.locator(".to-confirm")).toHaveCount(0);
  await expectSeatBooking(page);
  await expect(page.locator('.course-book a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();
  await expect(page.locator(".do-steps li").first()).toBeVisible();
  // Keyboard order reaches each live link, and the agent diagram's text-version toggle.
  // Assumes the skip link is the first tab stop and moves focus to main.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const reached: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? document.activeElement?.tagName ?? ""));
  }
  const { SEAT_BOOKING_URL: booking } = await import("../src/config/booking.mjs");
  expect(reached).toEqual(["#need-title", booking, "mailto:alan@burningsuit.co.uk", "SUMMARY"]);
  // The agent diagram is captioned, with an alt that leads with the main relationship.
  await expect(page.locator("main figure.course-figure img")).toHaveAttribute("alt", /^An agent combines an AI model running elsewhere/);
  await context.close();
});

test("homepage keeps the approved sections, order and starting points", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  await expect(page.locator(".home-opening .eyebrow")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /how i train/i })).toHaveCount(0);
  await expect(page.locator("main img")).toHaveCount(1);
  await expect(page.locator("h1 .em")).toHaveText("isn't");
  await expect(page.locator(".introduction strong")).toHaveText("someone");
  const courses = page.getByRole("article");
  await expect(courses.getByRole("heading", { level: 3 })).toHaveText(["Power BI fundamentals", "Power BI with AI agents 101"]);
  // One self-contained price item names both delivery methods; the 101 adds its public seat rates.
  const homeFacts: Record<string, string[]> = {
    "Power BI fundamentals": ["2 days", "Private, for your team", copy.homeFundamentals],
    "Power BI with AI agents 101": ["Half a day, live online", `Public course: ${RUN.longDate}, ${RUN.times}, ${RUN.people}`, copy.publicSeat, "Private for your team: price on request"],
  };
  // The 101 card books on the course page; Fundamentals asks through the form.
  for (const [name, ask] of [["Power BI fundamentals", "Ask about dates"], ["Power BI with AI agents 101", "Book a seat"]]) {
    const entry = page.getByRole("article", { name });
    await expect(entry.locator(".facts > li")).toHaveText(homeFacts[name]);
    await expect(entry.getByRole("link", { name: "Read the course outline" })).toHaveCount(1);
    await expect(entry.getByRole("link", { name: ask })).toHaveAttribute("href", ask === "Book a seat" ? "/training/power-bi-with-ai-agents-101/#book-title" : "#contact");
  }
  await expect(page.locator(`time[datetime="${RUN.date}"]`)).toHaveText(RUN.longDate);
  await expect(page.locator(".specialist-names > li")).toHaveText(["DAX fundamentals (1 day)", "DAX deep dive (2 days)"]);
  await expect(page.locator(".specialist-names")).toBeVisible();
  // Separators are decorative: hidden from assistive technology and never left at a line start or end.
  await expect(page.locator(".specialist-names")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - link "DAX fundamentals":
          - /url: /training/dax-fundamentals/
        - text: (1 day)
      - listitem:
        - link "DAX deep dive":
          - /url: /training/dax-deep-dive/
        - text: (2 days)
  `);
  // Course facts and specialist names share the same wrapping middot line.
  const separators = async () => (await page.locator(".dot-list").evaluateAll((lists) => lists.flatMap((list) => {
    const edge = list.getBoundingClientRect().left;
    const clipped = getComputedStyle(list).overflow === "hidden";
    return [...list.children].map((item) => {
      const left = item.getBoundingClientRect().left;
      return { rowStart: Math.abs(left - edge) < 1, shown: !clipped || left + parseFloat(getComputedStyle(item, "::before").left) >= edge };
    });
  })));
  expect(await page.locator(".dot-list").count()).toBe(3);
  for (const { rowStart, shown } of await separators()) expect(shown).toBe(!rowStart);
  await expect(page.getByRole("link", { name: "Compare all courses" })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("link", { name: /^Tell me what you use Power BI for now/ })).toHaveAttribute("href", "#contact");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Find your starting point", "Understanding that lasts", "Help with your own reporting", "Tell me what you're looking for."]);
  await expect(page.getByRole("link", { name: "Book a free 30-minute call" })).toHaveAttribute("href", "/call/");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
  await expect(page.locator(".proof, .exercise")).toHaveCount(0);
  // One approved, anonymised pull quote, in the teaching section.
  await expect(page.locator("main blockquote")).toHaveCount(1);
  await expect(page.locator("#teaching figure.pull-quote figcaption")).toHaveText("Performance support officer, a local authority");
  for (const id of ["training", "teaching", "consultancy", "contact"]) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  // The consultancy band stays raised above the page background (shared .raised-band in app.css).
  const bg = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg("#consultancy")).not.toBe(await bg("body"));
  // Wide screens: the dark title band holds only the title, across the full width, and the lede; the introduction then
  // opens the daylight sheet beside the portrait, and the starting points follow below it.
  let intro = await box(page, ".introduction"), title = await box(page, ".title-band h1"), introCopy = await box(page, ".intro-copy"), list = await box(page, ".courses"), photo = await box(page, ".alan-photo");
  expect(title.width).toBeGreaterThan(introCopy.width + photo.width);
  expect(Math.min(introCopy.y, photo.y)).toBeGreaterThanOrEqual((await box(page, ".title-band")).y + (await box(page, ".title-band")).height);
  expect(photo.x).toBeGreaterThanOrEqual(introCopy.x + introCopy.width);
  expect(list.y).toBeGreaterThanOrEqual(intro.y + intro.height);
  expect(await page.locator(".title-band").evaluate((el) => getComputedStyle(el.closest(".dark")!).backgroundColor)).toBe(await bg("body"));
  expect(await page.locator(".introduction").evaluate((el) => el.closest(".dark"))).toBeNull();
  // The band holds the title, its standfirst and two first-screen actions: a course, or help with your own reports.
  await expect(page.locator(".title-band > *")).toHaveCount(3);
  await expect(page.locator(".title-actions a")).toHaveText(["Find a course", "Get help with your own reports"]);
  expect(await page.locator(".title-actions a").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(["#training", "#consultancy"]);
  // Both entries are buttons, not one button and a text link.
  expect(await page.locator(".title-actions a").evaluateAll((links) => links.map((link) => link.className))).toEqual(["button", "button"]);
  expect(await bg("main")).not.toBe(await bg("body"));
  // The two primary entries sit side by side at equal width; the specialists follow beneath them.
  const [fundamentals, agents] = [await box(page, 'article[aria-labelledby="fundamentals-title"]'), await box(page, 'article[aria-labelledby="agents-101-title"]')];
  expect(Math.abs(fundamentals.width - agents.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(fundamentals.y - agents.y)).toBeLessThanOrEqual(1);
  expect((await box(page, ".specialists")).y).toBeGreaterThanOrEqual(Math.max(fundamentals.y + fundamentals.height, agents.y + agents.height));

  await page.setViewportSize({ width: 390, height: 844 });
  title = await box(page, ".title-band"); introCopy = await box(page, ".intro-copy"); list = await box(page, ".courses"); photo = await box(page, ".alan-photo");
  // Narrow screens: the title band, the portrait, then the introduction, then the courses.
  expect(photo.y).toBeGreaterThanOrEqual(title.y + title.height);
  expect(introCopy.y).toBeGreaterThanOrEqual(photo.y + photo.height);
  expect(list.y).toBeGreaterThanOrEqual(introCopy.y + introCopy.height);
  for (const { rowStart, shown } of await separators()) expect(shown).toBe(!rowStart);
  // On a phone the two title buttons stack at the same full width.
  const actions = await page.locator(".title-actions .button").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().width));
  expect(actions[0]).toBe(actions[1]);
  expect(actions[0]).toBe((await box(page, ".title-actions")).width);
});

test("enquiry form is a labelled plain POST with nothing preselected that validates without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("link", { name: "Ask about dates" }).click();
  await expect(page).toHaveURL(baseURL! + "/#contact");
  const form = page.getByRole("form", { name: "Tell me what you're looking for." });
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("method", "post");
  if (ENQUIRY.action) await expect(form).toHaveAttribute("action", ENQUIRY.action);
  else await expect(form).not.toHaveAttribute("action", /./);
  // Three fields: an optional name, then the required email and message; no topic or organisation.
  await expect(form.getByRole("textbox")).toHaveCount(3);
  await expect(form.locator("fieldset, [type=radio]")).toHaveCount(0);
  await expect(form.getByLabel("Name (optional)", { exact: true })).not.toHaveAttribute("required", "");
  await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute("required", "");
  await expect(form.getByLabel("Your message")).toHaveAttribute("required", "");
  await expect(form.getByLabel("Your message")).toHaveAccessibleDescription("A line or two is enough: a course name, or what's going on with your reports.");
  const send = form.getByRole("button");
  await expect(send).toHaveText("Send");
  await expect(send).toHaveAttribute("type", "submit");
  // Without a delivery endpoint, Send is visibly unavailable rather than silently failing.
  if (ENQUIRY.action) await expect(send).toBeEnabled();
  else await expect(send).toBeDisabled();
  await expect(page.locator('#contact a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();

  // Browser validation marks an incomplete enquiry, then accepts one completed from the keyboard.
  await expect(form.locator(":invalid")).not.toHaveCount(0);
  await form.getByLabel("Name (optional)").fill("Test Person");
  await page.keyboard.press("Tab");
  await page.keyboard.type("test@example.com");
  await page.keyboard.press("Tab");
  await expect(form.getByLabel("Your message")).toBeFocused();
  await page.keyboard.type("A team of four.");
  await page.keyboard.press("Tab");
  await expect(form.getByRole("link", { name: "Read how I handle your information" })).toBeFocused();
  await page.keyboard.press("Tab");
  if (ENQUIRY.action) await expect(send).toBeFocused();
  else await expect(page.locator(`#contact .fallback a[href="mailto:${ENQUIRY.email}"]`)).toBeFocused();
  await expect(form.locator(":invalid")).toHaveCount(0);
  await context.close();
});

// Every standing page's title carries one emphasised word, in the dark band's amber.
test("each standing page's title has one amber emphasis", async ({ page }) => {
  for (const route of ["/", "/training/", course, "/training/power-bi-fundamentals/", "/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/how-i-train/", "/power-bi/", "/about/", "/call/", "/work/carbon-footprint/", "/work/contact-centre/", "/work/dax-deep-dive/", "/work/individual-power-bi-coaching/"]) {
    await page.goto(route);
    const em = page.locator("h1 .em");
    await expect(em).toHaveCount(1);
    const [color, amber] = await Promise.all([em.evaluate((el) => getComputedStyle(el).color), page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--amber)"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; })]);
    expect(color).toBe(amber);
  }
});

test("every page but home and contact opens on the title band, and its body opens the daylight sheet", async ({ page }) => {
  const routes = ["/training/", course, "/training/power-bi-fundamentals/", "/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/how-i-train/", "/power-bi/", "/about/", "/call/", "/privacy/", "/privacy/enquiries/", "/enquiry-received/", "/enquiry-error/", "/work/", "/work/carbon-footprint/", "/work/contact-centre/", "/work/dax-deep-dive/", "/work/individual-power-bi-coaching/", "/writing/we-are-all-middle-management-now/", "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/", "/404.html"];
  await page.setViewportSize({ width: 1366, height: 900 });
  let edge: number | undefined;
  for (const route of routes) {
    await page.goto(route);
    const h1 = page.locator(".title-band h1");
    await expect(h1, route).toHaveCount(1);
    await expect(page.locator("h1"), route).toHaveCount(1);
    expect(await h1.evaluate((el) => !!el.closest(".dark.stage")), route).toBe(true);
    // The band's next sibling stage is followed by daylight, not another dark band.
    expect(await page.locator(".stage").first().evaluate((el) => el.nextElementSibling?.classList.contains("dark") ?? true), route).toBe(false);
    // One left edge for every title.
    const x = Math.round((await h1.boundingBox())!.x);
    edge ??= x;
    expect(Math.abs(x - edge), route).toBeLessThanOrEqual(1);
    // Nothing on the daylight sheet keeps the dark grounds' cream text.
    const cream = await page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--fg)"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    const stray = await page.locator("main :is(h2, h3, p, li, dt, dd, a)").evaluateAll((els, c) => els.filter((el) => !el.closest(".dark") && getComputedStyle(el).color === c && (el as HTMLElement).offsetParent).map((el) => el.textContent!.trim().slice(0, 40)), cream);
    expect(stray, route).toEqual([]);
  }
});

test("one heading scale across the site: a title size, a section size, a note size, an item size and a card size", async ({ page }) => {
  const routes = ["/", "/training/", course, "/training/power-bi-fundamentals/", "/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/how-i-train/", "/power-bi/", "/about/", "/call/", "/contact/", "/privacy/", "/work/", "/work/carbon-footprint/", "/work/contact-centre/", "/work/dax-deep-dive/", "/work/individual-power-bi-coaching/", "/writing/we-are-all-middle-management-now/"];
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes: Record<string, Set<number>> = { h1: new Set(), h2: new Set(), h3: new Set() };
    for (const route of routes) {
      await page.goto(route);
      const found = await page.locator("main :is(h1, h2, h3)").evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent && !el.closest(".home-title")).map((el) => [el.tagName.toLowerCase(), Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10] as const));
      for (const [tag, size] of found) sizes[tag].add(size);
    }
    // Home's title is deliberately larger; every other title shares one size.
    expect([...sizes.h1], `h1 at ${width}`).toHaveLength(1);
    // Section headings plus the note heading; item headings plus the card title.
    expect(sizes.h2.size, `h2 sizes at ${width}: ${[...sizes.h2]}`).toBeLessThanOrEqual(2);
    expect(sizes.h3.size, `h3 sizes at ${width}: ${[...sizes.h3]}`).toBeLessThanOrEqual(2);
  }
});
