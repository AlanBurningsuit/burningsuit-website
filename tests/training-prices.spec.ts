import { test, expect, otherScripts } from "./analytics";
import { prices, copy, rates, expectOnlyTrackedAmounts, expectNone, expectSeatBooking } from "./prices";
import { RUN } from "../src/config/course-run.mjs";

// Prices render from the tracked prices file (src/config/training-prices.json); expected wording is composed from it.
const routes = { home: "/", training: "/training/", agents: "/training/power-bi-with-ai-agents-101/", fundamentals: "/training/power-bi-fundamentals/", daxDeepDive: "/training/dax-deep-dive/", daxFundamentals: "/training/dax-fundamentals/", consultancy: "/power-bi/" };
const unaffected = ["/call/", "/about/", "/contact/", "/training/how-i-train/", "/work/", "/privacy/", "/404.html"];

const html = async (request: import("@playwright/test").APIRequestContext, route: string) => (await request.get(route)).text();
const decode = (text: string) => text.replaceAll("&#39;", "'").replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&nbsp;", " ");

test("every rate slot appears on its pages and nowhere else", async ({ request }) => {
  const pages = { home: decode(await html(request, routes.home)), training: decode(await html(request, routes.training)), agents: decode(await html(request, routes.agents)), fundamentals: decode(await html(request, routes.fundamentals)), daxDeepDive: decode(await html(request, routes.daxDeepDive)), daxFundamentals: decode(await html(request, routes.daxFundamentals)), consultancy: decode(await html(request, routes.consultancy)) };
  const items = {
    fundamentals: [copy.homeFundamentals, copy.trainingFundamentals, copy.fundamentalsDetail],
    specialists: Object.values(copy.specialists),
    daxDeepDive: [copy.daxDeepDiveDetail],
    daxFundamentals: [copy.daxFundamentalsDetail],
    seat: [copy.publicSeat, ...copy.seatFacts, copy.seatBookFacts],
    ranges: [copy.consultancyRange],
  };
  expect(pages.home).toContain(copy.homeFundamentals);
  expect(pages.home).toContain(copy.publicSeat);
  expect(pages.training).toContain(copy.trainingFundamentals);
  expect(pages.training).toContain(copy.publicSeat);
  for (const text of items.specialists) expect(pages.training).toContain(text);
  for (const text of copy.seatFacts) expect(pages.agents).toContain(text);
  expect(pages.agents).toContain(copy.seatBookFacts);
  expect(pages.fundamentals).toContain(copy.fundamentalsDetail);
  expect(pages.daxDeepDive).toContain(copy.daxDeepDiveDetail);
  expect(pages.daxFundamentals).toContain(copy.daxFundamentalsDetail);
  expect(pages.consultancy).toContain(copy.consultancyRange);

  // Each rate is checked individually against the pages that must carry it.
  const placement: Record<keyof typeof prices, (keyof typeof pages)[]> = {
    fundamentals: ["home", "training", "fundamentals"],
    daxFundamentals: ["training", "daxFundamentals"], daxDeepDive: ["training", "daxDeepDive"],
    agent101: ["home", "training", "agents"],
    consultancy: ["consultancy"],
  };
  const slots = Object.entries(prices).flatMap(([course, pair]) => Object.values(pair).map((value) => ({ course: course as keyof typeof prices, value })));
  for (const { value } of slots) {
    // Any two slots may hold the same value, so a value belongs on a page when any slot carrying it is placed there.
    const sharers = slots.filter((slot) => slot.value === value).map((slot) => slot.course);
    for (const [name, text] of Object.entries(pages)) expect(text.includes(value), `${value} on ${name}`).toBe(sharers.some((course) => placement[course].includes(name as keyof typeof pages)));
  }

  // Nothing else on the site, nor any attribute, script or metadata of these pages, carries a rate.
  for (const route of unaffected) {
    const response = await request.get(route);
    const text = response.status() === 200 ? decode(await response.text()) : "";
    for (const value of rates) expect(text, `no rate on ${route}`).not.toContain(value);
  }
  for (const [name, text] of Object.entries(pages)) {
    let rest = text;
    // Longest first: one item can open another (the 101's first seat fact starts its booking line).
    for (const item of Object.values(items).flat().sort((a, b) => b.length - a.length)) rest = rest.replaceAll(item, "");
    for (const value of rates) expect(rest, `${name} shows rates only inside their approved items`).not.toContain(value);
  }
});

test("coaching and the private 101 keep the approved price on request wording", async ({ page }) => {
  await page.goto(routes.home);
  // The private 101 stays on request on Home and Training, as one fact of its own; coaching keeps Price on request on Training.
  await expect(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li").last()).toHaveText("Private for your team: price on request");
  await page.goto(routes.training);
  await expect(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li").last()).toHaveText("Private for your team: price on request");
  await expect(page.locator("#coaching .facts > li").last()).toHaveText("Price on request");
  await expect(page.getByText("Price on request", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Private for your team: price on request", { exact: true })).toHaveCount(1);
  // The private 101 is one fact of its own, so the amounts above it cannot be read as its price.
  await expect(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li")).toHaveText(["Half a day, live online", `Public course: ${RUN.longDate}, ${RUN.times}, ${RUN.people}`, copy.publicSeat, "Private for your team: price on request"]);
  await expect(page.locator(".training-intro > p").nth(1)).toHaveText(copy.trainingIntro);
  // Consultancy shows its usual range; the free call never carries a price.
  await page.goto("/power-bi/");
  await expect(page.locator(".run-facts > li").first()).toHaveText(copy.consultancyRange);
  await page.goto("/call/");
  await expectOnlyTrackedAmounts(page, "free call");
  expect(await page.locator("main").innerText()).not.toMatch(/[£€$]\s*\d|ex VAT|founding rate/i);
});

test("the 101 books through the Stripe link", async ({ page }) => {
  await page.goto(routes.agents);
  await expectSeatBooking(page);
  await expect(page.locator("main a[href*='pay']:not([href*='buy.stripe.com']), main a[href='#contact'], main form")).toHaveCount(0);
  // The private email ask is unchanged and has no price item of its own on this page.
  await expect(page.getByRole("link", { name: "Ask about a private course." })).toHaveAttribute("href", "mailto:alan@burningsuit.co.uk");
  expectNone(await page.locator("main").innerText(), [/Also private/, /Price on request/], "101 detail private price");
});

test("price wording is neutral, ex VAT and free of urgency", async ({ page }) => {
  for (const route of Object.values(routes)) {
    await page.goto(route);
    const text = await page.locator("main").innerText();
    expectNone(text, [/limited|only \d|hurry|last chance|early bird|launch offer|discount|save |offer ends|countdown|sold out/i, /<s>|<del>|line-through/], `neutral wording on ${route}`);
    expect(await page.locator("s, del, ins, mark, .badge, .countdown").count(), "no strike-through, badge or countdown").toBe(0);
  }
});

test("price pages stay static: no scripts, islands or structured price data (the identity JSON-LD carries no offer or price)", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  for (const route of Object.values(routes)) {
    await page.goto(route);
    await expect(page.locator(`${otherScripts}, astro-island`)).toHaveCount(0);
    for (const block of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(/"(offers?|price|priceCurrency|priceSpecification|Offer)"/.test(block), `no price data in JSON-LD on ${route}`).toBe(false);
    await expectOnlyTrackedAmounts(page, `no-JavaScript ${route}`);
  }
  await context.close();
  for (const route of Object.values(routes)) {
    const text = await html(request, route);
    expect(/__ASTRO|hydrat|astro-island/.test(text), `no client price data on ${route}`).toBe(false);
  }
});
