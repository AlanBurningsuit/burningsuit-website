import { test, expect, servedAsProduction } from "./analytics";
import { priced } from "./prices";
import { EVENTS } from "../src/config/analytics.mjs";
import { SEAT_BOOKING_URL } from "../src/config/booking.mjs";
import { ENQUIRY } from "../src/config/enquiry.mjs";

// Clicks towards a booking and on Send are counted as Umami events (the privacy notice says so). A link is never marked
// itself: Umami would hold it until the beacon answered. Tracked.astro's wrapper carries the mark, so the link follows at once.
const callBooking = "https://cal.com/alan-burningsuit/call";
const course101 = "/training/power-bi-with-ai-agents-101/";
const call = "Book a free 30-minute call";
const seat = "Book a seat";

type Placement = { route: string; event: string; place?: string; name: string; href: string };
const placements: Placement[] = [
  { route: "/", event: EVENTS.bookCallLink, name: call, href: "/call/" },
  { route: "/power-bi/", event: EVENTS.bookCallLink, place: "top", name: call, href: "/call/" },
  { route: "/power-bi/", event: EVENTS.bookCallLink, place: "agents", name: call, href: "/call/" },
  { route: "/power-bi/", event: EVENTS.bookCallLink, place: "start", name: call, href: "/call/" },
  { route: "/contact/", event: EVENTS.bookCallLink, name: call, href: "/call/" },
  { route: "/work/carbon-footprint/", event: EVENTS.bookCallLink, name: call, href: "/call/" },
  { route: "/call/", event: EVENTS.bookCall, place: "top", name: call, href: callBooking },
  { route: "/call/", event: EVENTS.bookCall, place: "bottom", name: call, href: callBooking },
  // Seat booking opens only in the priced build; the unpriced one has nothing to count.
  ...(priced ? [
    { route: "/", event: EVENTS.bookSeatLink, name: seat, href: `${course101}#book-title` },
    { route: "/training/", event: EVENTS.bookSeatLink, name: seat, href: `${course101}#book-title` },
    { route: course101, event: EVENTS.bookSeat, place: "top", name: seat, href: SEAT_BOOKING_URL },
    { route: course101, event: EVENTS.bookSeat, place: "bottom", name: seat, href: SEAT_BOOKING_URL },
  ] : []),
];
const formRoutes = ["/", "/training/", "/training/power-bi-fundamentals/", "/training/dax-fundamentals/", "/training/dax-deep-dive/", "/power-bi/", "/contact/"];
const routes = [...new Set([...placements.map(({ route }) => route), ...formRoutes, "/training/", course101])];

for (const route of routes) {
  test(`booking links and Send are marked for counting on ${route}`, async ({ page }) => {
    await page.goto(route);
    const expected = placements.filter((placement) => placement.route === route);
    for (const { event, place, name, href } of expected) {
      const wrapper = page.locator(`span.tracked[data-umami-event="${event}"]${place ? `[data-umami-event-place="${place}"]` : ":not([data-umami-event-place])"}`);
      await expect(wrapper).toHaveCount(1);
      // The wrapper takes no part in layout, and holds the one link.
      expect(await wrapper.evaluate((element) => getComputedStyle(element).display)).toBe("contents");
      await expect(wrapper.locator("*")).toHaveCount(1);
      await expect(wrapper.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    const send = formRoutes.includes(route) ? 1 : 0;
    await expect(page.locator("button[type=submit][data-umami-event]")).toHaveCount(send);
    if (send) await expect(page.getByRole("button", { name: "Send", exact: true })).toHaveAttribute("data-umami-event", EVENTS.enquirySend);
    // Nothing else is counted, and no link carries the mark itself.
    await expect(page.locator("[data-umami-event]")).toHaveCount(expected.length + send);
    await expect(page.locator("a[data-umami-event]")).toHaveCount(0);
  });
}

test("a link after a counted link keeps its spacing", async ({ page }) => {
  // The wrapper sits between the two links, so sibling rules have to allow for it (app.css).
  await page.goto("/power-bi/");
  const next = page.locator("#ai").locator("xpath=ancestor-or-self::section").locator(".tracked + .text-link");
  await expect(next).toHaveCount(1);
  expect(await next.evaluate((element) => getComputedStyle(element).marginTop)).toBe("0px");
});

test("a booking click is counted with its place and the link follows at once", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const { bodies } = await servedAsProduction(context, baseURL!);
  await context.route("https://cal.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Booking stub</title>" }));
  const page = await context.newPage();
  await page.goto("https://burningsuit.co.uk/call/");
  await page.waitForFunction(() => "umami" in window);
  await page.locator(`[data-umami-event-place="top"]`).getByRole("link", { name: call, exact: true }).click();
  await expect(page).toHaveURL(callBooking);
  await expect.poll(() => bodies.filter((body) => body.payload?.name).map((body) => [body.type, body.payload!.name, body.payload!.data?.place])).toEqual([["event", EVENTS.bookCall, "top"]]);
  expect(bodies.find((body) => body.payload?.name)!.payload!.url).toContain("/call/");
  await context.close();
});

test("a booking link still follows when Umami never answers", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  // Every beacon hangs, as in an Umami outage.
  const { beacons } = await servedAsProduction(context, baseURL!, () => new Promise(() => {}));
  await context.route("https://cal.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Booking stub</title>" }));
  const page = await context.newPage();
  await page.goto("https://burningsuit.co.uk/call/");
  await page.waitForFunction(() => "umami" in window);
  await page.locator(`[data-umami-event-place="bottom"]`).getByRole("link", { name: call, exact: true }).click();
  await expect(page).toHaveURL(callBooking, { timeout: 3_000 });
  expect(beacons.length).toBeGreaterThan(0);
  await context.close();
});

test("sending the enquiry form is counted and still posts to the form provider", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const { bodies } = await servedAsProduction(context, baseURL!);
  let posted = false;
  await context.route(ENQUIRY.action!, (route) => {
    posted = route.request().method() === "POST";
    return route.fulfill({ status: 200, contentType: "text/html", body: "<title>Provider stub</title>" });
  });
  const page = await context.newPage();
  await page.goto("https://burningsuit.co.uk/contact/");
  await page.waitForFunction(() => "umami" in window);
  const form = page.getByRole("form");
  await form.getByLabel("Email", { exact: true }).fill("test@example.com");
  await form.getByLabel("Your message", { exact: true }).fill("A sample enquiry.");
  await form.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page).toHaveTitle("Provider stub");
  expect(posted).toBe(true);
  await expect.poll(() => bodies.filter((body) => body.payload?.name).map((body) => body.payload!.name)).toEqual([EVENTS.enquirySend]);
  // The event carries its name and page only: nothing typed into the form.
  expect(JSON.stringify(bodies)).not.toContain("test@example.com");
  expect(JSON.stringify(bodies)).not.toContain("A sample enquiry.");
  await context.close();
});
