import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect, otherScripts } from "./analytics";
import { pages, reserved404Routes } from "../src/config/compatibility.mjs";

const essay = "/writing/we-are-all-middle-management-now/";
const archive = "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/";
const prose = JSON.parse(readFileSync(new URL("./fixtures/article-prose.json", import.meta.url), "utf8")) as Record<string, { paragraphCount: number; sha256: string }>;
const studyPaths = ["/work/dax-deep-dive/", "/work/contact-centre/", "/work/individual-power-bi-coaching/", "/work/carbon-footprint/"];

test("Work groups only the four active studies in the approved offer order", async ({ page }) => {
  await page.goto("/work/");
  await expect(page.locator("h1")).toHaveText("Work");
  await expect(page.locator("#cases")).toHaveCount(1);
  await expect(page.locator("h2")).toHaveText(["Courses", "Power BI coaching", "Consultancy"]);
  expect(await page.locator(".work-entries a").evaluateAll(all => all.map(a => a.getAttribute("href")))).toEqual(studyPaths);
  await expect(page.locator(".work-entries p")).toHaveText(["A local-authority team", "A contact-centre team lead", "An individual learner developing Power BI reporting", "A UK university's sustainability team"]);
  await expect(page.locator(".work-entries h3")).toHaveText(["DAX deep dive for a local-authority team", "Coaching a contact-centre team lead", "He already built the reports. Coaching was about what's underneath them.", "Their own method, in a model they can check."]);
  await expect(page.locator("nav a:not(.nav-menu a)")).toHaveText(["Training", "Consultancy", "About", "Contact"]);
  for (const path of reserved404Routes) await expect(page.locator(`a[href="/${path}/"]`)).toHaveCount(0);
  for (const link of await page.locator(".work-group h2 a").all()) expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain("underline");
});

test("contextual and footer links lead to the matching evidence and restored essay", async ({ page }) => {
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
    await expect(page.locator("main").getByRole("link", { name: "Work", exact: true })).toHaveAttribute("href", "/work/");
  }
  await page.goto("/about/");
  await expect(page.locator("#human").getByRole("link", { name: "We're all middle management now", exact: true })).toHaveAttribute("href", essay);
  for (const route of ["/", "/work/", essay, archive]) {
    await page.goto(route);
    await expect(page.locator("footer").getByRole("link", { name: "Work", exact: true })).toHaveAttribute("href", "/work/");
    await expect(page.locator("footer").getByRole("link", { name: "We're all middle management now", exact: true })).toHaveAttribute("href", essay);
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
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="article:published_time"], meta[property="article:modified_time"], script[type="application/ld+json"], form, iframe, astro-island, [style], link[rel="canonical"], [data-rebuild-placeholder]')).toHaveCount(0);
    await expect(page.locator(otherScripts)).toHaveCount(0);
    expect(await page.locator(".article-related a").evaluateAll(all => all.map(a => a.getAttribute("href")))).toEqual(["/about/", "/training/", "/power-bi/"]);
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
  await expect(page.locator(".article-byline")).toHaveText("Stuart Box · March 2021");
  await expect(page.locator("time")).toHaveCount(1);
  await expect(page.locator("time")).toHaveAttribute("datetime", "2021-03");
  for (const id of pages["blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
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
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("A");
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineWidth))).toBeGreaterThanOrEqual(3);
    await context.close();
  });
  for (const width of [320, 390, 768, 1366]) {
    test(`article/index reflow at ${width}px: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      for (const size of ["100%", "200%"]) {
        await page.evaluate(size => document.documentElement.style.fontSize = size, size);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const el of await page.locator("main p, main h1, main h2, main h3, main figure").all()) {
          const box = (await el.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        }
      }
    });
  }
  for (const width of [1366, 390]) {
    test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      for (const img of await page.locator("main img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
      await page.evaluate(() => scrollTo(0, 0));
      const capture = info.outputPath("page.png");
      await page.screenshot({ path: capture, fullPage: true });
      await info.attach("page", { path: capture, contentType: "image/png" });
    });
  }
}
