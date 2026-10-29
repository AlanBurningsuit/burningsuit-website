import { test, expect } from "@playwright/test";
import { ANALYTICS, BOOKING_URL, KIT_ESSAY_FORM_ACTION, NOTES_URL } from "../src/config/site";
import { has101Booking } from "../src/config/asks";

/**
 * The custom events (404 tracking, email-intent, booking-intent, the
 * per-page asks — 101 booking or interest, course enquiry — notes-intent,
 * the essay signup, study-read) reach umami.track() correctly. The tracker script is routed to a recording stub that defines
 * window.umami before enhance.ts runs (the mocked tag is a defer script in
 * <head>, the module runs at end of body), so assertions read the recorded
 * calls — no beacon mocking or counting (csp.spec.ts owns the beacon
 * contract).
 */

type Recorder = { __umamiCalls?: unknown[][] };

const readCalls = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as Recorder).__umamiCalls ?? []);

test.beforeEach(async ({ page }) => {
  await page.route(ANALYTICS.scriptSrc, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.umami = { track: (n, d) => (window.__umamiCalls = window.__umamiCalls || []).push(d === undefined ? [n] : [n, d]) };",
    }),
  );
});

test("404 page tracks a 404 event carrying the missed path", async ({ page }) => {
  // http-server does not rewrite missing paths to 404.html — hit the file
  // directly. In production GitHub Pages serves it at the requested path, so
  // location.pathname is the missed URL; here that means "/404.html" itself.
  await page.goto("/404.html", { waitUntil: "load" });
  const calls = await readCalls(page);
  expect(calls).toContainEqual(["404", { path: "/404.html" }]);
});

test("mailto click tracks an Email click event; regular pages track no 404", async ({ page }) => {
  await page.goto("/about/", { waitUntil: "load" });

  // Keep headless browsers from attempting the external mailto protocol —
  // a capture-phase preventDefault; the site's bubble-phase listener still fires.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target as Element | null;
        if (el?.closest?.('a[href^="mailto:"]')) e.preventDefault();
      },
      true,
    );
  });

  await page.locator('footer a[href^="mailto:"]').click();

  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Email click"]);
  expect(calls.some((ev) => ev[0] === "404")).toBe(false);
});

for (const [path, placement] of [
  ["/about/", "header"], ["/about/", "footer"],
  ["/power-bi/", "power-bi-hero"], ["/power-bi/", "power-bi-pricing"],
  ["/work/", "work"],
  ["/hour/", "hour-page"],
]) {
test(`booking click on ${placement} keeps its event URL and attribution`, async ({ page }) => {
  await page.goto(path, { waitUntil: "load" });

  // Booking links open a new tab — cancel that so the assertion stays in
  // this page; the site's bubble-phase listener still fires.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target as Element | null;
        if (el?.closest?.('a[href^="https://cal.com/"]')) e.preventDefault();
      },
      true,
    );
  });

  const booking = page.locator(`a[href^="${BOOKING_URL}"][href*="utm_content=${placement}"]`);
  await expect(booking).toHaveText("Book an hour");
  await expect(booking).toHaveAttribute("href", `${BOOKING_URL}?utm_source=burningsuit&utm_content=${placement}&placement=${placement}`);
  await booking.click();

  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Booking click", { placement }]);
});
}

for (const [path, placement] of [
  ["/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/", "archive"],
]) {
test(`notes click on ${placement} keeps its signup URL and attribution`, async ({ page }) => {
  await page.goto(path, { waitUntil: "load" });

  // Notes links open a new tab — cancel that, as for booking links.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target as Element | null;
        if (el?.closest?.('a[href^="https://burningsuit.kit.com/"]')) e.preventDefault();
      },
      true,
    );
  });

  const notes = page.locator(`a[href^="${NOTES_URL}"][href*="utm_content=${placement}"]`);
  await expect(notes).toHaveText("Notes from burningsuit");
  await expect(notes).toHaveAttribute("href", `${NOTES_URL}?utm_source=burningsuit&utm_content=${placement}`);
  await notes.click();

  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Notes click", { placement }]);
});
}

// Each page's ask records its own event with its placement; a mailto ask is
// not also an "Email click".
const event101 = has101Booking ? "101 booking click" : "101 interest click";
for (const [path, placement, event] of [
  ["/", "header", event101], ["/", "footer", event101], ["/", "home-way-in", event101],
  ["/training/agentic-101/", "header", event101], ["/training/agentic-101/", "101-hero", event101],
  ["/training/agentic-101/", "101-band", event101], ["/training/agentic-101/", "footer", event101],
  ["/training/", "header", "Enquiry click"], ["/training/", "training-band", "Enquiry click"],
  ["/training/", "footer", "Enquiry click"],
]) {
test(`${event} on ${path} ${placement}`, async ({ page }) => {
  await page.goto(path, { waitUntil: "load" });
  // Cancel the navigation (mailto or new tab) in the capture phase; the
  // site's bubble-phase listener still fires.
  await page.evaluate(() => {
    document.addEventListener("click", (e) => {
      if ((e.target as Element | null)?.closest?.("[data-track]")) e.preventDefault();
    }, true);
  });
  const ask = page.locator(`[data-track][data-placement="${placement}"]`);
  await expect(ask).toHaveCount(1);
  await ask.click();
  const calls = await readCalls(page);
  expect(calls).toContainEqual([event, { placement }]);
  expect(calls.some((ev) => ev[0] === "Email click")).toBe(false);
});
}

test("an essay ends with the inline Kit form, and a signup tracks Notes signup", async ({ page }) => {
  const posts: string[] = [];
  await page.route(`${KIT_ESSAY_FORM_ACTION}**`, (route) => {
    posts.push(route.request().postData() ?? "");
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>ok</p>" });
  });
  await page.goto("/writing/we-are-all-middle-management-now/", { waitUntil: "load" });
  // Record calls across the navigation the POST causes.
  const recorded: unknown[][] = [];
  await page.exposeFunction("__record", (call: unknown[]) => recorded.push(call));
  await page.evaluate(() => {
    const w = window as unknown as { umami: { track: (n: string, d?: unknown) => void }; __record: (c: unknown[]) => void };
    const original = w.umami.track;
    w.umami.track = (n, d) => { w.__record(d === undefined ? [n] : [n, d]); original(n, d); };
  });
  const form = page.locator("form.notes-form");
  await expect(form).toHaveAttribute("action", KIT_ESSAY_FORM_ACTION);
  await expect(form).toHaveAttribute("method", "post");
  // An invalid address never submits, so it never counts.
  await page.getByLabel("Email address").fill("not-an-email");
  await form.getByRole("button").click();
  expect(recorded).toHaveLength(0);
  await page.getByLabel("Email address").fill("reader@example.com");
  await Promise.all([page.waitForURL(KIT_ESSAY_FORM_ACTION), form.getByRole("button").click()]);
  expect(recorded).toContainEqual(["Notes signup", { placement: "essay" }]);
  expect(posts[0]).toContain("email_address=reader%40example.com");
});

test("reaching a case study's closing door tracks a Study read event", async ({ page }) => {
  await page.goto("/work/law-firm/", { waitUntil: "load" });
  // Scroll the closing door itself into view — an instant jump to
  // scrollHeight can land with the section already above the viewport
  // (the footer can fill the final screen on desktop), and an
  // IntersectionObserver never fires for a section the viewport skipped.
  await page.locator("[data-track-study-end]").scrollIntoViewIfNeeded();
  // The observer fires asynchronously after the scroll settles.
  await page.waitForFunction(() =>
    ((window as { __umamiCalls?: unknown[][] }).__umamiCalls ?? []).some(
      (ev) => ev[0] === "Study read",
    ),
  );
  const calls = await readCalls(page);
  expect(calls).toContainEqual(["Study read", { study: "/work/law-firm/" }]);
  // Scrolling a study fires the read event exactly once.
  expect(calls.filter((ev) => ev[0] === "Study read")).toHaveLength(1);
});
