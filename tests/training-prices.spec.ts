import { test, expect, otherScripts } from "./analytics";
import { priced, copy, knownValues, expectAmountsOnlyWhenPriced, expectNone, expectItems, expectText, expectSeatBooking } from "./prices";
import { readFileSync } from "node:fs";
import { PRICE_SLOTS } from "../src/lib/training-prices.mjs";

// The built site is either the Price on request variant or the priced variant (SHOW_TRAINING_PRICES=true at build and test time).
// Every price-bearing comparison happens in memory and asserts a boolean with a fixed message: no failure prints an amount.
const routes = { home: "/", training: "/training/", agents: "/training/agentic-development-for-power-bi/", fundamentals: "/training/power-bi-fundamentals/", daxDeepDive: "/training/dax-deep-dive/", daxFundamentals: "/training/dax-fundamentals/" };
const unaffected = ["/power-bi/", "/hour/", "/about/", "/contact/", "/training/how-i-train/", "/work/", "/privacy/", "/404.html"];

const html = async (request: import("@playwright/test").APIRequestContext, route: string) => (await request.get(route)).text();
const decode = (text: string) => text.replaceAll("&#39;", "'").replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&nbsp;", " ");

test("the build under test matches the variant requested", async ({ request }) => {
  // Fails instead of skipping: a priced run against an unpriced build (or the reverse) is an error.
  const training = decode(await html(request, routes.training));
  expect(training.includes(">Private course prices are per booking, for up to 8 people, and include UK travel.<"), "priced introduction is present only in the priced build").toBe(priced);
  expect(/ex VAT/.test(training), "ex VAT wording is present only in the priced build").toBe(priced);
  if (priced) expect(knownValues.length, "ten private rates are loaded").toBe(PRICE_SLOTS.length);
});

test("ten rate slots appear on their pages and nowhere else", async ({ request }) => {
  const pages = { home: decode(await html(request, routes.home)), training: decode(await html(request, routes.training)), agents: decode(await html(request, routes.agents)), fundamentals: decode(await html(request, routes.fundamentals)), daxDeepDive: decode(await html(request, routes.daxDeepDive)), daxFundamentals: decode(await html(request, routes.daxFundamentals)) };
  if (!priced) {
    // Unpriced: no amount, price wording or founding-rate text on any of the six routes, and no private value even if the file exists locally.
    for (const [name, text] of Object.entries(pages)) {
      expect(!/[£€$]\s?\d/.test(text) && !/ex VAT|founding rate|Standard rate|per booking/i.test(text), `unpriced ${name} has no price wording`).toBe(true);
      expect(knownValues.every((value) => !text.includes(value)), `unpriced ${name} holds no private rate`).toBe(true);
    }
    return;
  }
  const rates = {
    fundamentals: [copy!.homeFundamentals, copy!.trainingFundamentals, copy!.fundamentalsDetail],
    specialists: Object.values(copy!.specialists),
    daxDeepDive: [copy!.daxDeepDiveDetail],
    daxFundamentals: [copy!.daxFundamentalsDetail],
    seat: [copy!.publicSeat, ...copy!.seatFacts, copy!.seatBookFacts],
  };
  expect(rates.fundamentals.every((text) => [pages.home, pages.training, pages.fundamentals].some((page) => page.includes(text))), "Fundamentals rates render").toBe(true);
  expect(pages.home.includes(copy!.homeFundamentals) && pages.home.includes(copy!.publicSeat), "Home renders both course price items").toBe(true);
  expect(pages.training.includes(copy!.trainingFundamentals) && pages.training.includes(copy!.publicSeat) && rates.specialists.every((text) => pages.training.includes(text)), "Training renders every course price item").toBe(true);
  expect(copy!.seatFacts.every((text) => pages.agents.includes(text)) && pages.agents.includes(copy!.seatBookFacts), "101 renders both seat rates in its facts and booking line").toBe(true);
  expect(pages.fundamentals.includes(copy!.fundamentalsDetail), "Fundamentals renders the full private price").toBe(true);
  expect(pages.daxDeepDive.includes(copy!.daxDeepDiveDetail), "DAX deep dive renders the full private price").toBe(true);
  expect(pages.daxFundamentals.includes(copy!.daxFundamentalsDetail), "DAX fundamentals renders the full private price").toBe(true);

  // Each of the ten stored rates is checked individually against the pages that must carry it.
  const data = JSON.parse(readFileSync("design/copy/training-prices.json", "utf8"));
  const placement: Record<string, string[]> = {
    "power-bi-fundamentals": ["home", "training", "fundamentals"],
    "dax-fundamentals": ["training", "daxFundamentals"], "data-modelling": ["training"], "dax-deep-dive": ["training", "daxDeepDive"],
    "agentic-development-for-power-bi": ["home", "training", "agents"],
  };
  let all = true;
  for (const [course, key] of PRICE_SLOTS) {
    const value = data[course][key] as string;
    // Any two slots may hold the same value, so a value belongs on a page when any slot carrying it is placed there.
    const sharers = PRICE_SLOTS.filter(([c, k]) => data[c][k] === value).map(([c]) => c);
    for (const [name, text] of Object.entries(pages)) all &&= text.includes(value) === sharers.some((c) => placement[c].includes(name));
  }
  expect(all, "all ten rates appear on exactly their intended pages").toBe(true);

  // Nothing else on the site, nor any attribute, script or metadata of these pages, carries a rate.
  for (const route of unaffected) {
    const response = await request.get(route);
    const text = response.status() === 200 ? decode(await response.text()) : "";
    expect(knownValues.every((value) => !text.includes(value)), `no rate on ${route}`).toBe(true);
  }
  for (const [name, text] of Object.entries(pages)) {
    let rest = text;
    for (const slot of [...rates.fundamentals, ...rates.specialists, ...rates.daxDeepDive, ...rates.daxFundamentals, ...rates.seat]) rest = rest.replaceAll(slot, "");
    expect(knownValues.every((value) => !rest.includes(value)), `${name} shows rates only inside their approved items`).toBe(true);
  }
});

test("unpriced and priced items keep the approved private-course wording", async ({ page }) => {
  await page.goto(routes.home);
  // The private 101 keeps Price on request on Home and Training in both variants; coaching keeps it on Training.
  await expectText(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li").last(), "Price on request", "private 101 price remains on request");
  await page.goto(routes.training);
  await expectText(page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li").last(), "Price on request", "private 101 price remains on request");
  await expectText(page.locator("#coaching .facts > li").last(), "Price on request", "coaching remains on request");
  // Priced: private 101 and coaching. Unpriced: Fundamentals, the 101, three specialists and coaching.
  await expect(page.getByText("Price on request", { exact: true })).toHaveCount(priced ? 2 : 6);
  if (priced) {
    // The private-101 line follows "Also private, for your team", so the amounts above it cannot be read as its price.
    const facts = page.getByRole("article", { name: "Power BI with AI agents 101" }).locator(".facts > li");
    await expectItems(facts, ["Half a day, live online", "Public course: Wednesday 20 January 2027, 9:30am to 12:30pm UK time, 4 to 8 people", copy!.publicSeat, "Also private, for your team", "Price on request"], "101 chooser facts");
    await expectText(page.locator(".training-intro > p").nth(1), copy!.trainingIntro, "training price statement");
  }
  // Consultancy and the free call keep their approved wording in both variants.
  await page.goto("/power-bi/");
  await expectText(page.locator(".run-facts > li").first(), "Price on request, usually a fixed price", "consultancy remains on request");
  await page.goto("/hour/");
  await expectAmountsOnlyWhenPriced(page, "free call");
  expect(await page.locator("main").innerText()).not.toMatch(/ex VAT|founding rate/i);
});

test("the 101 books through the Stripe link only in the priced build, and stays closed and unlinked otherwise", async ({ page }) => {
  await page.goto(routes.agents);
  await expectSeatBooking(page);
  await expect(page.locator("main a[href*='pay']:not([href*='buy.stripe.com']), main a[href='#contact'], main form")).toHaveCount(0);
  // The private email ask is unchanged and has no price item of its own on this page.
  await expect(page.getByRole("link", { name: "Ask about a private course." })).toHaveAttribute("href", "mailto:alan@burningsuit.co.uk");
  const detail = await page.locator("main").innerText();
  expectNone(detail, [/Also private/, ...(priced ? [/Price on request/] : [])], "101 detail private price");
});

test("price wording is neutral, ex VAT and free of urgency", async ({ page }) => {
  test.skip(!priced, "wording is only present in the priced variant");
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
    await expectAmountsOnlyWhenPriced(page, `no-JavaScript ${route}`);
  }
  await context.close();
  for (const route of Object.values(routes)) {
    const text = await html(request, route);
    expect(/__ASTRO|hydrat|astro-island/.test(text), `no client price data on ${route}`).toBe(false);
  }
});
