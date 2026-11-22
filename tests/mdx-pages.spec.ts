import { createHash } from "node:crypto";
import { NEWSLETTER } from "../src/config/newsletter.mjs";
import { EVENTS } from "../src/config/analytics.mjs";
import { readFileSync } from "node:fs";
import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, forEachTextSize } from "./helpers";
import { pages, reserved404Routes } from "../src/config/compatibility.mjs";

const essay = "/writing/we-are-all-middle-management-now/";
const archive = "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/";
const prose = JSON.parse(readFileSync(new URL("./fixtures/article-prose.json", import.meta.url), "utf8")) as Record<string, { paragraphCount: number; sha256: string }>;
const studyPaths = ["/work/dax-deep-dive/", "/work/contact-centre/", "/work/individual-power-bi-coaching/", "/work/carbon-footprint/"];

test("Work groups only the four active studies in the approved offer order", async ({ page }) => {
  await page.goto("/work/");
  await expect(page.locator("h1")).toHaveText("Case studies");
  await expect(page.locator("#cases")).toHaveCount(1);
  await expect(page.locator("h2")).toHaveText(["Courses", "Power BI coaching", "Consultancy", "Not sure which fits?"]);
  // The page's own words: a standfirst, the anonymity line, one line per offer and a way to ask.
  await expect(page.locator(".title-band .standfirst")).toHaveText("What the courses, coaching and consultancy look like in practice.");
  await expect(page.locator(".work-intro")).toHaveText("Every example here is anonymous.");
  await expect(page.locator(".work-group-lead p")).toHaveText(["A course teaches a group from prepared teaching files.", "For 1 to 3 people from the same organisation, learning Power BI on the work they actually do.", "I work alongside your team on your own reports and models, so they understand what we build."]);
  await expect(page.locator(".work-next a")).toHaveAttribute("href", "/contact/");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Case studies");
  expect(await page.locator(".work-entries a").evaluateAll(all => all.map(a => a.getAttribute("href")))).toEqual(studyPaths);
  await expect(page.locator(".work-entries p")).toHaveText([
    "Two days of on-site DAX exercises across two groups, with a worked variables example afterwards.",
    "Weekly sessions on her own reporting data so she could fix and extend her reports herself.",
    "Modelling and DAX on example data shaped around his reporting, with homework between sessions.",
    "A UK university's carbon reporting method brought out of spreadsheets into one checkable model.",
  ]);
  await expect(page.locator(".work-entries h3")).toHaveText(["DAX deep dive for a local-authority team", "Coaching a contact-centre team lead", "Individual Power BI coaching", "Carbon reporting in a model the team can check"]);
  await expect(page.locator("nav a:not(.nav-menu a)")).toHaveText(["Training", "Consultancy", "Case studies", "About", "Contact"]);
  for (const path of reserved404Routes) await expect(page.locator(`a[href="/${path}/"]`)).toHaveCount(0);
  // Group and card titles read as headings at rest and underline on hover.
  for (const link of await page.locator(":is(.work-group h2, .work-entries h3) a").all()) {
    expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toBe("none");
    await link.hover();
    expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain("underline");
  }
});

test("contextual and footer links lead to the matching evidence, the restored essay and Writing", async ({ page }) => {
  await page.goto("/work/");
  const headings = await page.locator(".work-entries h3 a").evaluateAll(all => Object.fromEntries(all.map(a => [a.getAttribute("href"), a.textContent])));
  const assertions: [string, string, string[]][] = [
    ["/training/", ".specialist-courses", [studyPaths[0]]],
    ["/training/", "#coaching", [studyPaths[1], studyPaths[2]]],
    ["/training/how-i-train/", '[aria-labelledby="own-work-title"]', [studyPaths[1], studyPaths[2]]],
    ["/power-bi/", "#situations", [studyPaths[3]]],
  ];
  for (const [route, selector, expected] of assertions) {
    await page.goto(route);
    expect(await page.locator(`${selector} .study-links a`).evaluateAll(all => all.map(a => a.getAttribute("href")))).toEqual(expected);
    await expect(page.locator(`${selector} .study-evidence-label`)).toHaveText(expected.length === 1 ? "Case study" : "Case studies");
    await expect(page.locator(`${selector} .study-links a`)).toHaveText(expected.map(href => headings[href] ?? ""));
    await expect(page.locator("main").getByRole("link", { name: "Case studies", exact: true })).toHaveAttribute("href", "/work/");
  }
  await page.goto("/about/");
  await expect(page.locator("#human").getByRole("link", { name: "We're all middle management now", exact: true })).toHaveAttribute("href", essay);
  for (const route of ["/", "/work/", essay, archive]) {
    await page.goto(route);
    await expect(page.locator("footer").getByRole("link", { name: "Case studies", exact: true })).toHaveAttribute("href", "/work/");
    await expect(page.locator("footer").getByRole("link", { name: "Writing", exact: true })).toHaveAttribute("href", "/writing/");
  }
});

test("reserved study social cards are unavailable", async ({ request }) => {
  for (const route of reserved404Routes) {
    const response = await request.get(`/social/linkedin-${route.replaceAll("/", "-")}.png`);
    expect(response.status()).toBe(404);
  }
});

for (const [route, kind, author] of [[essay, "essay", "Alan Harman-Box"], [archive, "archive", "Stuart Box"]]) {
  test(`${kind}: preserved source prose, author and restrained metadata`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(200);
    const paras = await page.locator(".article-intro p, .case-prose p").allTextContents();
    const normalized = paras.map(p => p.replace(/\s+/g, " ").trim()).join("\n");
    expect(paras).toHaveLength(prose[kind].paragraphCount);
    expect(createHash("sha256").update(normalized).digest("hex")).toBe(prose[kind].sha256);
    await expect(page.locator('meta[name="author"]')).toHaveAttribute("content", author);
    await expectIndexable(page, { article: true });
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="article:published_time"], meta[property="article:modified_time"], iframe, astro-island, [style]')).toHaveCount(0);
    // Essays and archive posts alike end with the newsletter sign-up: a plain POST to Kit with one email field and no Kit script.
    const signup = page.locator("form.newsletter-form");
    await expect(signup).toHaveCount(1);
    await expect(page.locator("form")).toHaveCount(1);
    await expect(signup).toHaveAttribute("action", NEWSLETTER.action);
    await expect(signup).toHaveAttribute("method", "post");
    // Subscribe is counted as an event, like the enquiry form's Send; it is the page's only counted control.
    await expect(signup.getByRole("button", { name: "Subscribe", exact: true })).toHaveAttribute("data-umami-event", EVENTS.newsletterSubscribe);
    await expect(page.locator("[data-umami-event]")).toHaveCount(1);
    await expect(signup.locator("input")).toHaveCount(1);
    await expect(signup.getByLabel("Email")).toHaveAttribute("name", NEWSLETTER.field);
    await expect(signup.getByLabel("Email")).toHaveAttribute("required", "");
    await expect(page.getByRole("heading", { name: "Get the newsletter" })).toBeVisible();
    await expect(page.locator(".newsletter-copy > p")).toHaveText("I'll write when I've got something worth saying. Mostly what I'm seeing where AI meets Power BI inside real teams: what it's genuinely good at now, where it quietly goes wrong, and what that means for whoever has to stand behind the numbers.");
    await expect(signup.getByRole("link", { name: "Read how I handle your information" })).toHaveAttribute("href", NEWSLETTER.privacyPath);
    expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain("https://app.kit.com");
    await expect(page.locator(otherScripts)).toHaveCount(0);
    // The essay leads on to the course it bears on; the archive post to the offers only.
    expect(await page.locator(".article-related a").evaluateAll(all => all.map(a => a.getAttribute("href")))).toEqual([...(kind === "essay" ? ["/training/power-bi-with-ai-agents-101/"] : []), "/writing/", "/about/", "/training/", "/power-bi/"]);
  });
}

test("essay appearances and all four unchanged responsive diagrams retain their captions", async ({ page }) => {
  await page.goto(essay);
  await expect(page.locator(".article-appearances time")).toHaveText(["19 February 2026", "26 March 2026", "2 April 2026"]);
  expect(await page.locator(".article-appearances time").evaluateAll(all => all.map(t => t.getAttribute("datetime")))).toEqual(["2026-02-19", "2026-03-26", "2026-04-02"]);
  await expect(page.locator("figure")).toHaveCount(4);
  await expect(page.locator("figcaption")).toHaveText([
    "Figure 1: The agentic system. The harness runs the requested tool and returns its result to the model's context.",
    "Figure 2: The visual validation loop. The screenshot returns to the agent, which checks the result and can revise the report.",
    "Figure 3: The vibe zone. The shaded area is the vibe zone. As consequences grow, specify more of the decisions yourself.",
    "Figure 4: Domain experience. With less domain experience, the vibe zone shrinks. Delegate fewer decisions at the same level of consequence.",
  ]);
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    for (const img of await page.locator(".essay-diagram img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute("alt", /.+/);
      await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await img.evaluate(el => (el as HTMLImageElement).currentSrc)).toMatch(width === 390 ? /-narrow/ : /-wide/);
    }
  }
});

test("archive retains month precision, original section anchors and fixed URL", async ({ page }) => {
  await page.goto(archive);
  await expect(page.locator(".title-band .standfirst")).toHaveText("Roche's Maxim is Matthew Roche's rule for where to change your data in Power BI: as far upstream (near the source) as possible, and as far downstream (near the report) as necessary.");
  await expect(page.locator(".article-byline")).toHaveText("Stuart Box · March 2021");
  await expect(page.locator("time")).toHaveCount(1);
  await expect(page.locator("time")).toHaveAttribute("datetime", "2021-03");
  for (const id of pages["blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  expect(await page.locator(".archive-next a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual(["/training/power-bi-fundamentals/", "/training/"]);
  expect((await page.goto("/writing/roches-maxim/"))?.status()).toBe(404);
});

for (const route of ["/work/", essay, archive]) {
  test(`static no-JavaScript reading and keyboard access: ${route}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.keyboard.press("Tab");
    // A writing page's first stop is the eyebrow's link back to the Writing index.
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("A");
    if (route !== "/work/") expect(await page.evaluate(() => document.activeElement?.getAttribute("href"))).toBe("/writing/");
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(3);
    await context.close();
  });
  test(`article/index reflow from 320px to 1366px: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await forEachTextSize(page, async () => {
        const overflow = await page.locator("main p, main h1, main h2, main h3, main figure").evaluateAll((els, limit) =>
          els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && (r.left < 0 || r.right > limit + 1)),
        width);
        expect(overflow, `${route} at ${width}px`).toEqual([]);
      });
    }
  });
  visualReview(route);
}

test("the newsletter's thank-you page is off the index and leads back into the site", async ({ page }) => {
  expect((await page.goto(NEWSLETTER.successPath))?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Check your email");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".service-copy p:not(.links)")).toHaveText([
    "Thanks for subscribing. I've sent you an email with a link to confirm. Once you've clicked it, you're on the list.",
    "If it hasn't arrived in a few minutes, have a look in your spam folder.",
  ]);
  expect(await page.locator(".service-copy .links a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual(["/writing/", "/training/", "/"]);
  await expect(page.locator("form, [data-umami-event]")).toHaveCount(0);
  expect(await (await page.request.get("/sitemap-0.xml")).text()).not.toContain("/subscribed/");
});
