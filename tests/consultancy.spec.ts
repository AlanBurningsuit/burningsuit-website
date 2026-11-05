import { test, expect } from "@playwright/test";
import { pages } from "../src/config/compatibility.mjs";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";

const route = "/power-bi/";
const hour = "https://cal.com/alan-burningsuit/hour";

test("consultancy page stays static, private and CSP-clean", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL) external.push(request.url());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
  });
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Power BI consultancy | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Power BI consultancy done with your team, on your own data, models and reports, so the team can run it without me afterwards. Price on request.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('script, astro-island, link[rel="canonical"], [data-rebuild-placeholder]')).toHaveCount(0);
  expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain(`form-action ${formActionSource}`);
  await expect(page.locator('nav a[aria-current]')).toHaveText("Consultancy");
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("consultancy page follows the visitor questions with the kept anchors", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("Power BI consultancy that leaves your team independent");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["The work I take on", "How I work with your team", "AI agents on your own Power BI", "How the work runs", "After the work", "Who does the work", "How to start", "Prefer to write?"]);

  // Exactly the kept anchors from the route manifest, each on its own section, and none of the dropped ones.
  expect(pages["power-bi"]).toEqual(["situations", "how-the-work-runs", "pricing", "ai", "ongoing", "start"]);
  for (const [id, heading] of [["situations", "The work I take on"], ["how-the-work-runs", "How the work runs"], ["ai", "AI agents on your own Power BI"], ["ongoing", "After the work"], ["start", "How to start"]]) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`[id="${id}"] h2`)).toHaveText(heading);
  }
  await expect(page.locator(".do-steps > li").nth(1)).toHaveAttribute("id", "pricing");
  for (const id of ["deliver", "skills", "handover", "backup", "second-opinion", "discovery"]) await expect(page.locator(`[id="${id}"]`)).toHaveCount(0);

  await expect(page.locator(".run-facts > li")).toHaveText(["Price on request, usually a fixed price", "You get me, working with your team", "Built so your team can run it without me afterwards", "It starts with a free hour on a call"]);
  await expect(page.locator("#situations .lead-list > li strong")).toHaveText(["Thinking through your reporting as a whole.", "Owning the Power BI you've already got.", "Building or moving something, together.", "Getting started with AI agents."]);
  await expect(page.locator(".do-steps")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "The free hour." [level=3]:
          - link "The free hour"
        - paragraph
      - listitem:
        - heading "A price for the whole job." [level=3]
        - paragraph
      - listitem:
        - heading "The work, with your team." [level=3]
        - paragraph
      - listitem:
        - heading "Handover." [level=3]
        - paragraph
  `);
  await expect(page.locator(".do-steps h3 a")).not.toHaveClass(/text-link/);

  // Only the AI band is raised; the spine sits on the page background.
  const background = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
  const ground = await background("body");
  expect(await background("#ai")).not.toBe(ground);
  for (const selector of ["#how-the-work-runs", "#situations", "#ongoing", "#start"]) expect(await background(selector)).toBe("rgba(0, 0, 0, 0)");
  // #start leads with the free hour on the page background, before the shared form's band.
  expect(await background("#contact")).not.toBe(ground);
  expect(await page.locator("#start + #contact").count()).toBe(1);

  const text = await page.locator("main").innerText();
  for (const absent of [/\[|\]/, /second opinion/i, /discovery/i, /case stud/i]) expect(text).not.toMatch(absent);
  await expect(page.locator("main img, blockquote, .to-confirm")).toHaveCount(0);
});

test("consultancy links go to the free hour, the AI band, the courses and About", async ({ page }) => {
  await page.goto(route);
  const free = page.getByRole("link", { name: "Book a free hour on a call" });
  await expect(free).toHaveCount(3);
  for (const link of await free.all()) await expect(link).toHaveAttribute("href", hour);
  await expect(page.getByRole("link", { name: "The free hour" })).toHaveAttribute("href", hour);
  await expect(page.getByRole("link", { name: "More on that below", exact: true })).toHaveAttribute("href", "#ai");
  await expect(page.getByRole("link", { name: "That's what the courses are for." })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual([hour, "#ai", "/training/", hour, hour, "/about/", hour, ENQUIRY.privacyPath, `mailto:${ENQUIRY.email}`]);
});

test("consultancy enquiry form is labelled, plain and has nothing preselected", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("form")).toHaveCount(1);
  const form = page.getByRole("form", { name: "Prefer to write?" });
  await expect(form).toHaveAttribute("method", "post");
  await expect(page.locator(".enquiry-intro p")).toHaveText("A few lines on where you are and what you need is plenty.");
  const topics = form.getByRole("radio");
  await expect(topics).toHaveCount(ENQUIRY.topics.length);
  for (const topic of await topics.all()) await expect(topic).not.toBeChecked();
  await expect(page.locator('#contact .fallback a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();
});

test("consultancy page works without JavaScript, from keyboard and from a legacy address", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/ai-fit-for-teams/");
  await expect(page).toHaveURL(baseURL! + route + "#ai");
  await expect(page.locator("#ai h2")).toBeInViewport();
  // A dropped fragment lands at the top of the page.
  await page.goto("/");
  await page.goto(route + "#discovery");
  await expect(page.locator("h1")).toBeInViewport();
  await page.goto("/");
  await page.goto(route + "#pricing");
  await expect(page.locator("#pricing h3")).toBeInViewport();
  await page.goto("/");
  await page.goto(route);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
  }
  expect(reached).toEqual([hour, "#ai", "/training/", hour, hour, "/about/", hour]);
  // The step heading link shows a visible focus ring.
  await page.locator(".do-steps h3 a").focus();
  expect(await page.locator(".do-steps h3 a").evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  await page.getByRole("link", { name: "More on that below", exact: true }).click();
  await expect(page).toHaveURL(baseURL! + route + "#ai");
  await context.close();
});

test("consultancy layout: facts beside the introduction on wide screens, after it on narrow ones", async ({ page }) => {
  const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  let intro = await box(".course-intro"), facts = await box(".course-run");
  expect(facts.x).toBeGreaterThanOrEqual(intro.x + intro.width);
  expect(facts.y).toBeLessThan(intro.y + intro.height);
  for (const [lead, body] of [["#situations .split-lead", "#situations .split-body"], ["#ongoing .ongoing-lead", "#ongoing .ongoing-body"], [".who-does h2", ".who-note"], ["#start .book-inner > div:first-child", ".start-link"]]) {
    const [l, b] = [await box(lead), await box(body)];
    expect(b.x).toBeGreaterThanOrEqual(l.x + l.width);
  }
  // Who does the work reads at body width, not the 101's narrow aside.
  expect((await box(".who-note")).width).toBeGreaterThan(600);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    intro = await box(".course-intro"); facts = await box(".course-run");
    expect(facts.y).toBeGreaterThanOrEqual(intro.y + intro.height);
    expect((await box("#situations")).y).toBeGreaterThanOrEqual(facts.y + facts.height);
    for (const selector of [".do-steps", ".lead-list", ".start-link", ".run-action", ".do-steps h3 a"]) {
      for (const item of await page.locator(selector).all()) {
        const b = (await item.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
      }
    }
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`consultancy page reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

for (const width of [1366, 390]) {
  test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const capture = info.outputPath("page.png");
    await page.screenshot({ path: capture, fullPage: true });
    await info.attach("page", { path: capture, contentType: "image/png" });
  });
}
