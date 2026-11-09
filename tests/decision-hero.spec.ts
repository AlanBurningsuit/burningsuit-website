import { type Page } from "@playwright/test";
import { test, expect } from "./analytics";
import { priced, copy, expectItems } from "./prices";

// The decision hero (DecisionHero.astro) on the four course pages: title, standfirst, facts and the primary action
// together on the dark stage, the introduction below on the daylight sheet. Each page's own spec pins its wording;
// this one checks the shared structure, scale, layout, reflow and access. Training, Consultancy and Home keep their openings.
const heroes = [
  { route: "/training/power-bi-fundamentals/", label: "Course facts", action: ".run-action", price: () => [copy!.fundamentalsDetail] },
  { route: "/training/dax-fundamentals/", label: "Course facts", action: ".run-action", price: () => [copy!.daxFundamentalsDetail] },
  { route: "/training/dax-deep-dive/", label: "Course facts", action: ".run-action", price: () => [copy!.daxDeepDiveDetail] },
  { route: "/training/power-bi-with-ai-agents-101/", label: "Course facts and booking", action: ".book-button", price: () => copy!.seatFacts },
] as const;

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const facts = (page: Page) => page.locator(".hero-facts .run-facts > li").evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, price: el.classList.contains("fact-price") };
}));

for (const { route, label, action, price } of heroes) {
  test(`decision hero groups title, facts and action on the dark stage: ${route}`, async ({ page }) => {
    await page.goto(route);
    const hero = page.locator(".dark.stage .title-band.decision-hero");
    await expect(hero).toHaveCount(1);
    expect(await hero.evaluate((el) => [...el.children].map((child) => child.tagName + "." + child.className))).toEqual(["H1.", "P.standfirst", "SECTION.hero-facts"]);
    const group = page.getByRole("region", { name: label, exact: true });
    await expect(group).toHaveCount(1);
    await expect(hero.locator("section.hero-facts")).toHaveAttribute("aria-label", label);
    // The old lifted facts card is gone; the introduction opens the daylight sheet alone, at reading width.
    await expect(page.locator(".course-run")).toHaveCount(0);
    await expect(page.locator(".dark.stage .course-intro")).toHaveCount(0);
    await expect(page.locator(".course-opening.decision-opening > *")).toHaveCount(1);
    await expect(page.locator(".course-opening.decision-opening > .course-intro")).toHaveCount(1);
    // One facts list; the price item(s) come last, in reading order as well as on screen.
    const items = group.locator(".run-facts > li");
    const classes = await items.evaluateAll((els) => els.map((el) => el.classList.contains("fact-price")));
    const first = classes.indexOf(true);
    expect(first).toBeGreaterThan(0);
    expect(classes.slice(first).every(Boolean)).toBe(true);
    if (copy) await expectItems(group.locator(".run-facts > li.fact-price"), [...price()], "hero price items");
    else await expect(group.locator(".run-facts > li.fact-price")).toHaveText(["Price on request"]);
    // The primary action is inside the same group, after the facts.
    await expect(group.locator(action)).toHaveCount(1);
    expect(await group.locator(action).evaluate((el) => el.classList.contains("button"))).toBe(true);
  });

  test(`decision hero keeps the shared heading scale and button: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/training/how-i-train/");
    const scale = await page.locator(".title-band h1").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.fontFamily, s.fontWeight, s.lineHeight]; });
    const standfirst = await page.locator(".title-band .standfirst").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.fontFamily]; });
    await page.goto("/");
    const homeButton = await page.locator(".title-band .title-actions .button").first().evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.fontSize, s.fontFamily, s.borderRadius, s.paddingTop]; });
    await page.goto(route);
    expect(await page.locator(".title-band h1").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.fontFamily, s.fontWeight, s.lineHeight]; })).toEqual(scale);
    expect(await page.locator(".title-band .standfirst").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.fontFamily]; })).toEqual(standfirst);
    // The live primary action is the one amber button of a dark title band (the unpriced 101's control is the shared disabled state).
    const button = page.locator(`.hero-facts ${action}`);
    if (await button.evaluate((el) => (el as HTMLButtonElement).disabled === true)) {
      await expect(button).toHaveAttribute("aria-describedby", "booking-status-opening");
    } else {
      expect(await button.evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.fontSize, s.fontFamily, s.borderRadius, s.paddingTop]; })).toEqual(homeButton);
    }
  });

  test(`decision hero layout from 1366px to 320px: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    let stage = await box(page, ".dark.stage"), standfirst = await box(page, ".title-band .standfirst"), group = await box(page, ".hero-facts"), intro = await box(page, ".course-intro");
    expect(group.y).toBeGreaterThanOrEqual(standfirst.y + standfirst.height);
    expect(group.y + group.height).toBeLessThanOrEqual(stage.y + stage.height);
    expect(intro.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
    // Wide screens: the other facts share one middot line; each price takes its own line beneath; then the action.
    const wide = await facts(page);
    const line = wide.filter((f) => !f.price), prices = wide.filter((f) => f.price);
    for (const fact of line) expect(Math.abs(fact.top - line[0].top)).toBeLessThanOrEqual(1);
    for (const p of prices) expect(p.top).toBeGreaterThanOrEqual(Math.max(...line.map((f) => f.bottom)) - 1);
    expect((await box(page, `.hero-facts ${action}`)).y).toBeGreaterThanOrEqual(Math.max(...prices.map((p) => p.bottom)));
    expect(await page.locator(".hero-facts .run-facts > li:nth-child(2)").evaluate((el) => getComputedStyle(el, "::before").content)).not.toBe("none");
    expect(await page.locator(".hero-facts .run-facts > li:first-child").evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
    // Middots are decorative: the accessible text of the facts holds none.
    expect((await page.locator(".hero-facts .run-facts").ariaSnapshot()).includes("·")).toBe(false);
    // Everything needed to decide is on the first screen on desktop.
    await expect(page.locator(`.hero-facts ${action}`)).toBeInViewport({ ratio: 1 });

    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => scrollTo(0, 0));
      stage = await box(page, ".dark.stage"); standfirst = await box(page, ".title-band .standfirst"); group = await box(page, ".hero-facts"); intro = await box(page, ".course-intro");
      expect(group.y).toBeGreaterThanOrEqual(standfirst.y + standfirst.height);
      expect(group.y + group.height).toBeLessThanOrEqual(stage.y + stage.height);
      expect(intro.y).toBeGreaterThanOrEqual(group.y + group.height);
      for (const f of await facts(page)) {
        expect(f.left).toBeGreaterThanOrEqual(0);
        expect(f.right).toBeLessThanOrEqual(width);
      }
      // A middot is shown exactly where an item does not start a row (none on phones, where the facts form a grid).
      const marks = await page.locator(".hero-facts .run-facts").evaluate((list) => {
        const edge = list.getBoundingClientRect().left;
        return [...list.children].map((item) => {
          const left = item.getBoundingClientRect().left, content = getComputedStyle(item, "::before").content;
          return { rowStart: Math.abs(left - edge) < 1, price: item.classList.contains("fact-price"), shown: content !== "none" && left + parseFloat(getComputedStyle(item, "::before").left) >= edge };
        });
      });
      for (const { rowStart, price, shown } of marks) expect(shown).toBe(width > 680 && !price && !rowStart);
      const act = await box(page, `.hero-facts ${action}`);
      expect(act.x).toBeGreaterThanOrEqual(0);
      expect(act.x + act.width).toBeLessThanOrEqual(width);
      if (width <= 390) {
        // Phones: no middots; the facts pair in two columns and each price spans both; the action spans the content width.
        // A list with a fact too long to share a row (the 101's date and times) runs one fact to a row instead.
        expect(await page.locator(".hero-facts .run-facts > li:nth-child(2)").evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
        const narrow = await facts(page);
        const [a, b] = narrow;
        if (await page.locator(".hero-facts .run-facts .fact-wide").count()) {
          expect(route).toBe("/training/power-bi-with-ai-agents-101/");
          expect(b.top).toBeGreaterThanOrEqual(a.bottom);
          for (const f of narrow) expect(Math.abs(f.left - a.left)).toBeLessThanOrEqual(1);
        } else {
          expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(1);
          expect(b.left).toBeGreaterThan(a.right);
          for (const p of narrow.filter((f) => f.price)) expect(p.right - p.left).toBeGreaterThan((a.right - a.left) * 1.5);
        }
        if (action === ".run-action") expect(Math.abs(act.width - group.width)).toBeLessThanOrEqual(1);
        // A common phone (390x844, normal text size): the whole primary action is on the first screen.
        if (width === 390) {
          expect(await page.evaluate(() => scrollY)).toBe(0);
          expect(act.y).toBeGreaterThanOrEqual(0);
          expect(act.y + act.height).toBeLessThanOrEqual(844);
        }
      }
    }
  });

  test(`decision hero reflows with 200% text from 320px to 1366px: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 768, 1024, 1366]) {
      await page.setViewportSize({ width, height: 768 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const spills = await page.locator(".dark.stage *").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0).map((el) => el.className || el.tagName));
      expect(spills).toEqual([]);
      for (const f of await facts(page)) expect(f.right).toBeLessThanOrEqual(width);
    }
  });

  test(`decision hero action is reachable and visibly focused without JavaScript: ${route}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto(route);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    // The first tab stop in main is inside the hero: the action, or (on the 101) its Before you book link first.
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest(".hero-facts"))).toBe(true);
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(2);
    const live = page.locator(`.hero-facts ${action}:not(:disabled)`);
    if (await live.count()) {
      await live.focus();
      await expect(live).toBeFocused();
      expect(await live.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    }
    await context.close();
  });

  test(`decision hero is the same in light, dark and reduced-motion settings: ${route}`, async ({ page }) => {
    // The site has one fixed palette: the dark stage must not flip with the system scheme, and nothing in the hero moves.
    const read = () => page.locator(".hero-facts").evaluate((el) => {
      const s = getComputedStyle(el), stage = getComputedStyle(el.closest(".stage")!), li = getComputedStyle(el.querySelector("li")!);
      return [stage.backgroundColor, s.color, li.color, s.borderTopColor];
    });
    const results: string[][] = [];
    for (const colorScheme of ["light", "dark"] as const) {
      for (const reducedMotion of ["no-preference", "reduce"] as const) {
        await page.emulateMedia({ colorScheme, reducedMotion });
        await page.goto(route);
        results.push(await read());
        if (reducedMotion === "reduce") {
          const moving = await page.locator(".dark.stage, .dark.stage *").evaluateAll((els) => els.filter((el) => {
            const s = getComputedStyle(el);
            // Colour fades may remain (app.css); any movement (scale, translate, transform, animation) must not.
            const durations = s.transitionDuration.split(","), properties = s.transitionProperty.split(",").map((p) => p.trim());
            return s.animationName !== "none" || properties.some((p, i) => /^(all|scale|translate|transform|rotate)$/.test(p) && parseFloat(durations[i % durations.length]) > 0);
          }).map((el) => el.className || el.tagName));
          expect(moving).toEqual([]);
        }
      }
    }
    for (const result of results) expect(result).toEqual(results[0]);
  });
}

test("the decision hero stays off the training chooser, Consultancy and the homepage", async ({ page }) => {
  for (const route of ["/", "/training/", "/power-bi/", "/call/", "/training/how-i-train/"]) {
    await page.goto(route);
    await expect(page.locator(".decision-hero, .hero-facts, .decision-opening")).toHaveCount(0);
  }
  await page.goto("/power-bi/");
  await expect(page.locator("section.course-run")).toHaveCount(1);
});

test("priced variant puts no price outside the hero's price items on course pages", async ({ page }) => {
  test.skip(!priced, "priced build only");
  for (const { route, price } of heroes) {
    await page.goto(route);
    const other = await page.locator(".hero-facts .run-facts > li:not(.fact-price)").allInnerTexts();
    expect(other.every((text) => !/[£€$]\s*\d/.test(text)), "non-price facts hold no amount").toBe(true);
    const shown = await page.locator(".hero-facts .run-facts > li.fact-price").allInnerTexts();
    expect(shown.map((t) => t.trim()).join("|") === [...price()].join("|"), "hero price items match the private copy").toBe(true);
  }
});

test("the 101's whole Book a seat control is in the first 390x844 phone screen", async ({ page }) => {
  // Regression guard: the taller 101 hero (seat rates, Before you book) once pushed the booking button below the fold on phones.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/training/power-bi-with-ai-agents-101/");
  await page.evaluate(() => document.fonts.ready);
  const book = page.locator(".hero-facts .booking .book-button");
  await expect(book).toHaveCount(1);
  if (priced) await expect(book).toHaveAttribute("href", (await import("../src/config/booking.mjs")).SEAT_BOOKING_URL);
  await expect(book).toBeInViewport({ ratio: 1 });
  const b = (await book.boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(844);
  // Before you book still comes first, above the control.
  const before = (await page.locator(".hero-facts .before-book").boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(before.y + before.height);
});
