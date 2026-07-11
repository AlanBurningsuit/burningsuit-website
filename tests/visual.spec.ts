import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression tripwire. Region snapshots (not whole-page) so a local
 * layout regression can't hide under a loose full-page threshold. These
 * baselines are the Astro build itself: they protect Phase B refinements from
 * silently breaking structure. Fidelity vs the B5 source is a separate,
 * human-signed comparison (scripts/shoot.mjs), not asserted here.
 */
async function prepare(page: Page, path: string) {
  // Freeze time BEFORE load so nothing date-derived can drift between runs.
  await page.clock.setFixedTime(new Date("2026-07-02T10:30:00+01:00"));
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  // fire every reveal, then settle at the top
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

test("home — regions", async ({ page }, testInfo) => {
  await prepare(page, "/");
  const tag = testInfo.project.name;
  await expect(page.locator(".hero")).toHaveScreenshot(`home-hero-${tag}.png`);
  // The "how i work" chapter now also rides the `.what` spine, so `.what`
  // matches two sections on the homepage. Scope to the "what i do" services
  // section (its heading carries id="what") so the region stays unambiguous.
  await expect(page.locator(".what:has(#what)")).toHaveScreenshot(`home-services-${tag}.png`);
  await expect(page.locator(".statement-ch")).toHaveScreenshot(`home-statement-${tag}.png`);
  await expect(page.locator(".about")).toHaveScreenshot(`home-about-${tag}.png`);
  await expect(page.locator("footer")).toHaveScreenshot(`home-footer-${tag}.png`);
});

test("ai-fit-for-teams — regions", async ({ page }, testInfo) => {
  await prepare(page, "/ai-fit-for-teams/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`aifit-hero-${tag}.png`);
  await expect(page.locator(".movements")).toHaveScreenshot(`aifit-movements-${tag}.png`);
  await expect(page.locator(".fitmap")).toHaveScreenshot(`aifit-fitmap-${tag}.png`);
});

test("power-bi — regions", async ({ page }, testInfo) => {
  await prepare(page, "/power-bi/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`pbi-hero-${tag}.png`);
  await expect(page.locator(".proof")).toHaveScreenshot(`pbi-proof-${tag}.png`);
});

test("about — regions", async ({ page }, testInfo) => {
  await prepare(page, "/about/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`about-hero-${tag}.png`);
  // chapters scoped by their heading id so each `.chapter` locator is unambiguous.
  await expect(page.locator(".chapter:has(#capable)")).toHaveScreenshot(`about-capable-${tag}.png`);
  await expect(page.locator(".chapter:has(#human)")).toHaveScreenshot(`about-human-${tag}.png`);
  // origin is still text-only (Stuart & Alison photo pending); dog now carries
  // the Zelda inset — regenerate origin's baseline when its photo lands too.
  await expect(page.locator(".chapter:has(#origin)")).toHaveScreenshot(`about-origin-${tag}.png`);
  await expect(page.locator(".chapter:has(#dog)")).toHaveScreenshot(`about-dog-${tag}.png`);
});

test("work index — regions", async ({ page }, testInfo) => {
  await prepare(page, "/work/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`work-hero-${tag}.png`);
  // the four case-file tiles (scoped to the "case files" chapter heading)
  await expect(page.locator(".what:has(#cases)")).toHaveScreenshot(`work-cases-${tag}.png`);
});

test("work case study — regions", async ({ page }, testInfo) => {
  // law-firm is the flagship and exercises every kit component (Snapshot, Chapter,
  // Offer). Chapters scoped by heading id so each `.chapter` locator is unambiguous.
  await prepare(page, "/work/law-firm/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`work-study-hero-${tag}.png`);
  await expect(page.locator(".chapter:has(#snapshot)")).toHaveScreenshot(`work-study-snapshot-${tag}.png`);
  await expect(page.locator(".chapter:has(#did)")).toHaveScreenshot(`work-study-did-${tag}.png`);
});
