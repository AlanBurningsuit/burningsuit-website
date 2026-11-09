import { type Page } from "@playwright/test";
import { test, expect, isTracker, otherScripts, servedAsProduction, tracker } from "./analytics";
import { reportCspViolations, expectIndexable } from "./helpers";
import { ANALYTICS } from "../src/config/analytics.mjs";
import { ENQUIRY } from "../src/config/enquiry.mjs";
import { pages } from "../src/config/compatibility.mjs";

const route = "/privacy/";
const email = `mailto:${ENQUIRY.email}`;
const counted = { label: "Stop counting my visits", status: "Your visits from this browser can be counted." };
const excluded = { label: "Count my visits again", status: "Your visits from this browser aren't being counted." };
const failed = "This browser didn't let the site save the setting, so your visits may still be counted.";
const noScript = "With JavaScript off, the analytics don't run, so your visits aren't counted.";
const legal = "Burningsuit Limited · Registered in England and Wales, no. 05738130 · Registered office: The Courtyard, Shoreham Road, Upper Beeding, West Sussex, BN44 3TN · VAT no. 770 3248 38";

// Approved copy candidate 9, in page order (the switch's own labels and status lines are checked separately).
const headings = ["Who is responsible", "Counting visits", "Turn off visit counting", "Where the site is hosted", "Booking the free call", "Paying for a course seat", "Recordings of online courses", "Emailing me", "Your choices and rights", "Changes to this notice"];
const paragraphs = [
  "I'm Alan Harman-Box. This notice covers visiting this site, booking a free 30-minute call, paying for a course seat, recordings of online courses and emailing me. The enquiry form has its own notice.",
  "burningsuit is the trading name of Burningsuit Limited, registered in England and Wales, company number 05738130, registered office The Courtyard, Shoreham Road, Upper Beeding, West Sussex, BN44 3TN. VAT number 770 3248 38. The company is the controller of your information and is registered with the Information Commissioner's Office. Contact me at alan@burningsuit.co.uk.",
  "I use Umami to count which pages people read, so I can improve the site. It sets no cookies. For each page view it records the page, the page you came from, your browser and device, your approximate location, and how quickly and smoothly the page loaded. It also counts when someone uses a booking button or sends the enquiry form. It uses your IP address briefly but doesn't keep it in the statistics, and it can't link your visits from one month to the next.",
  "Umami Software, Inc., a US company, processes this for me in the US and the EU under its data processing agreement, which covers transfers from the UK. It keeps the statistics for 6 months. My lawful basis is legitimate interests. I don't profile anyone or sell the data. If you'd rather your visits weren't counted, turn counting off below.",
  "This switch stops Umami counting your visits from this browser. It's free, works straight away and can be switched back. It's saved in this browser, so clearing the site's data undoes it.",
  "The site is hosted on GitHub Pages. GitHub, Inc., a US company, logs visitors' IP addresses for its own security purposes, under its privacy statement.",
  "You book the free call on Cal.com. Cal.com, Inc. processes the details you enter for me in the US, relying on the UK Extension to the EU-US Data Privacy Framework. I delete each booking from my Cal.com account on the first working day after the call. The call runs on Microsoft Teams. When you book, you can choose whether I may record it. I only record if you tick that box; the recording stays in my Microsoft 365 account and is deleted automatically after 60 days. My lawful basis for a recording is your consent, which you can withdraw at any time, before or during the call. Paid sessions are covered by the terms you receive for them. My lawful basis and how long I keep my copy of the booking are under Emailing me.",
  "You pay for a seat on Stripe. Stripe processes your card or other payment details itself, so I never see them. I receive your name, email, billing address, any VAT number and your answer to how you heard about the course. My lawful basis is the contract for your seat. I keep these records for six years, because UK tax law requires me to keep my accounts for that long.",
  "Online courses, including Power BI with AI agents 101, run on Microsoft Teams, and I record them so everyone who took part can work through the session again. It's a standard Teams recording: you appear in it if your camera is on or you speak. I send a copy to everyone who attended. My own copy stays in my Microsoft 365 account and is deleted automatically after 60 days; I can't delete the copies I've sent. My lawful basis is legitimate interests: giving everyone on the course a record of it to learn from.",
  "Email links open your own email program. I use Microsoft 365 for email, and Microsoft's privacy statement covers its processing and transfers.",
  "For bookings and emails, my lawful basis is legitimate interests: answering people who contact me about training or consultancy. If you ask me to take steps towards a contract with you, that processing is necessary for those steps. Apart from Cal.com's copy, I keep them for as long as the enquiry or any engagement that follows needs them, then delete them.",
  "You can ask for a copy of your information, or ask me to correct, delete or restrict it. You can object to anything based on legitimate interests, including the analytics, which the switch stops. Where I'm using information for steps towards a contract you asked for, you can also ask for it in a reusable format, for you or another organisation. Email alan@burningsuit.co.uk, or complain to the Information Commissioner's Office.",
  "I update this notice when anything here changes.",
  "Last updated: 9 November 2026",
];
const links = [
  ENQUIRY.privacyPath, email, "https://umami.is/privacy", "https://umami.is/dpa", "#optout",
  "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
  "https://cal.com/privacy", "#email", "https://stripe.com/gb/privacy", "https://privacy.microsoft.com/en-gb/privacystatement",
  "#optout", email, "https://ico.org.uk/make-a-complaint/",
];
// Pages that render the shared footer (placeholders render none).
const footerRoutes = ["/", "/training/", "/training/power-bi-with-ai-agents-101/", "/training/power-bi-fundamentals/", "/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/how-i-train/", "/power-bi/", "/call/", "/about/", "/contact/", route, ENQUIRY.privacyPath, ENQUIRY.successPath, ENQUIRY.errorPath];

const control = (page: Page) => page.getByRole("button", { name: /my visits/ });
const status = (page: Page) => page.getByRole("status");

test("privacy notice stays static, private and CSP-clean, with only the tracker and its opt-out script", async ({ page, baseURL }) => {
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
  await expect(page).toHaveTitle("Privacy | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "What happens to your information when you visit this site, book a call or email me, and how to turn off visit counting.");
  await expectIndexable(page);
  await expect(page.locator(`[data-rebuild-placeholder], astro-island, form, iframe, embed, object, main img`)).toHaveCount(0);
  await expect(page.locator(tracker)).toHaveCount(1);
  await expect(page.locator(otherScripts)).toHaveCount(1);
  await expect(page.locator(otherScripts)).toHaveAttribute("type", "module");
  await expect(page.locator(otherScripts)).toHaveAttribute("src", /^\/_astro\/[^/]+\.js$/);
  // The reserved anchors are the eight section headings.
  expect(pages.privacy).toEqual(["who", "analytics", "optout", "hosting", "booking", "seat", "recordings", "email", "rights", "changes"]);
  for (const [index, id] of pages.privacy.entries()) await expect(page.locator(`h2#${id}`)).toHaveText(headings[index]);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
  // The tag reports only from the production domains, so no beacon leaves a test host.
  expect(external).toEqual([]);
});

test("privacy notice carries the approved words, headings and links in order", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("This site and your information");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(headings);
  await expect(page.locator(".service-copy > p:not(.optout-nojs)")).toHaveText(paragraphs);
  expect(await page.locator(".service-copy a").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")))).toEqual(links);
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-11-09");
  await expect(page.locator(".service-copy")).not.toContainText(/aria-pressed|\[|\]/);
});

test("the switch turns visit counting off and on, persists, and announces each state", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("[data-optout-root]")).toHaveAttribute("data-ready", "");
  await expect(page.getByText(noScript)).toBeHidden();
  await expect(control(page)).toHaveText(counted.label);
  await expect(control(page)).not.toHaveAttribute("aria-pressed", /.*/);
  await expect(status(page)).toHaveText(counted.status);
  await control(page).click();
  await expect(control(page)).toHaveText(excluded.label);
  await expect(status(page)).toHaveText(excluded.status);
  expect(await page.evaluate(() => localStorage.getItem("umami.disabled"))).toBe("1");
  await page.reload();
  await expect(control(page)).toHaveText(excluded.label);
  await expect(status(page)).toHaveText(excluded.status);
  // Keyboard: the switch is a native button, reachable and operable without a pointer.
  await control(page).focus();
  await page.keyboard.press("Enter");
  await expect(control(page)).toHaveText(counted.label);
  await expect(status(page)).toHaveText(counted.status);
  expect(await page.evaluate(() => localStorage.getItem("umami.disabled"))).toBeNull();
});

test("the switch reports a setting it could not save", async ({ page }) => {
  await page.addInitScript(() => {
    const refuse = () => { throw new DOMException("blocked", "SecurityError"); };
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await page.goto(route);
  await control(page).click();
  await expect(status(page)).toHaveText(failed);
  await expect(control(page)).toHaveText(counted.label);
});

test("the switch survives storage that cannot even be read", async ({ page }) => {
  // Umami's own tag may throw on unreadable storage (and then counts nothing); the opt-out script itself must not.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  await page.addInitScript(() => {
    const refuse = () => { throw new DOMException("blocked", "SecurityError"); };
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await page.goto(route);
  await expect(status(page)).toHaveText(counted.status);
  await control(page).click();
  await expect(status(page)).toHaveText(failed);
  expect(errors.filter((stack) => stack.includes("/_astro/"))).toEqual([]);
});

test("without JavaScript the switch is replaced by its fallback line", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.getByText(noScript)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.getByText(counted.status)).toBeHidden();
  await page.locator("#optout").scrollIntoViewIfNeeded();
  await test.info().attach("privacy-no-js-1366", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await context.close();
});

test("if the opt-out script fails to load, the fallback line stays and no dead button appears", async ({ page }) => {
  await page.route(/\/_astro\/[^/]+\.js$/, (request) => request.abort());
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(noScript)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator("[data-optout]")).toBeHidden();
  await page.locator("#optout").scrollIntoViewIfNeeded();
  await test.info().attach("privacy-module-failed", { body: await page.screenshot(), contentType: "image/png" });
});

for (const path of footerRoutes) {
  test(`footer carries the company line on its own row: ${path}`, async ({ page }) => {
    await page.goto(path);
    const line = page.locator("footer .foot-legal");
    await expect(line).toHaveText(legal);
    // Each separator stays with the segment before it.
    expect(await line.textContent()).toBe(legal.replaceAll(" ·", " ·"));
    await expect(page.locator("footer .foot-links a")).toHaveText([ENQUIRY.email, "Privacy", "Case studies", "Booking terms", "Essay: We're all middle management now", "LinkedIn"]);
    await expect(page.locator("footer")).not.toContainText("West Sussex, England");
  });
}

for (const width of [320, 390, 1366]) {
  test(`privacy notice and footer reflow at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const footer = await page.locator("footer").boundingBox();
      if (size === "100%") {
        const [legalSize, linkSize] = await page.evaluate(() => [".foot-legal", ".foot-links a"].map((selector) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)));
        expect(legalSize).toBeGreaterThanOrEqual(12);
        expect(linkSize).toBe(width < 680 ? 14 : 12.48);
      }
      const legalBox = await page.locator("footer .foot-legal").boundingBox();
      const linksBox = await page.locator("footer .foot-links").boundingBox();
      // The company line spans the footer's content row and the links sit beneath it, not squeezed beside it.
      expect(legalBox!.y + legalBox!.height).toBeLessThanOrEqual(linksBox!.y);
      expect(legalBox!.x + legalBox!.width).toBeLessThanOrEqual(footer!.x + footer!.width);
    }
  });
}

test("on the production domain the tag counts a visit until the switch turns it off", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const { beacons } = await servedAsProduction(context, baseURL!);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("https://burningsuit.co.uk/privacy/");
  await expect.poll(() => beacons.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(beacons.every((url) => url.startsWith(ANALYTICS.beaconHost))).toBe(true);
  await control(page).click();
  await expect(status(page)).toHaveText(excluded.status);
  beacons.length = 0;
  await page.goto("https://burningsuit.co.uk/");
  // The tag has run (it defines window.umami whether or not it counts) and the network has settled, so any beacon would have gone.
  await page.waitForFunction(() => "umami" in window);
  await page.waitForLoadState("networkidle");
  expect(beacons).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
