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
  // Neutralise sticky chrome: region captures stitch it in at arbitrary
  // scroll offsets (flaky), and anything baked over a region can hide a real
  // regression behind it. CSSOM writes are CSP-safe (style-src gates parsed
  // styles, not the object model). The header has its own coverage in
  // responsive.spec; the footer stays — home-footer snapshots it directly.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("header#hd, a.skip")) {
      el.style.visibility = "hidden";
    }
  });
}

test("home — regions", async ({ page }, testInfo) => {
  await prepare(page, "/");
  const tag = testInfo.project.name;
  await expect(page.locator(".hero")).toHaveScreenshot(`home-hero-${tag}.png`);
  // the trust moment (cream proof beat + credibility line), then the doors
  await expect(page.locator(".chapter:has(#in-practice)")).toHaveScreenshot(`home-trust-${tag}.png`);
  await expect(page.locator(".chapter:has(#what)")).toHaveScreenshot(`home-services-${tag}.png`);
  await expect(page.locator(".statement-ch")).toHaveScreenshot(`home-statement-${tag}.png`);
  await expect(page.locator(".about")).toHaveScreenshot(`home-about-${tag}.png`);
  // The footer is the FIXED basement (main slides over it), so scrollIntoView
  // is a no-op and the capture shows whatever main content overlays its box.
  // Pin absolute-bottom scroll so the basement is actually exposed — without
  // this the shot depends on the incidental scroll the .about capture leaves,
  // which shifts whenever page height changes (bit us 2026-07-15).
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
  await expect(page.locator("footer")).toHaveScreenshot(`home-footer-${tag}.png`);
});

test("ai-fit-for-teams — regions", async ({ page }, testInfo) => {
  await prepare(page, "/ai-fit-for-teams/");
  const tag = testInfo.project.name;
  await expect(page.locator(".page-hero")).toHaveScreenshot(`aifit-hero-${tag}.png`);
  await expect(page.locator(".movements")).toHaveScreenshot(`aifit-movements-${tag}.png`);
  // the carved field document (the page's signature object since 2026-07)
  await expect(page.locator(".fitmap-doc")).toHaveScreenshot(`aifit-fitmap-${tag}.png`);
  // the offer band: tonal --bg-2 grouping + the talk photo inset (rhythm trial)
  await expect(page.locator(".chapter:has(#how-it-works)")).toHaveScreenshot(`aifit-offer-band-${tag}.png`);
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
  await expect(page.locator(".chapter:has(#cases)")).toHaveScreenshot(`work-cases-${tag}.png`);
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

test("work museum — exhibit region", async ({ page }, testInfo) => {
  // the instrument exhibit (D10) — the first-call question chapter carries the
  // Exhibit figure; snapshot the whole chapter so the prose hand-off is covered.
  await prepare(page, "/work/museum/");
  const tag = testInfo.project.name;
  await expect(page.locator(".chapter:has(#question)")).toHaveScreenshot(`work-museum-question-${tag}.png`);
});

test("work museum — diagram region", async ({ page }, testInfo) => {
  // the flow-diagram exhibit (three systems → one model) in the build chapter.
  await prepare(page, "/work/museum/");
  const tag = testInfo.project.name;
  await expect(page.locator(".chapter:has(#build)")).toHaveScreenshot(`work-museum-build-${tag}.png`);
});

test("work carbon — exhibit region", async ({ page }, testInfo) => {
  // the list-shaped exhibit (the build rules) — covers the .exhibit ul styles.
  await prepare(page, "/work/carbon-footprint/");
  const tag = testInfo.project.name;
  await expect(page.locator(".chapter:has(#build)")).toHaveScreenshot(`work-carbon-build-${tag}.png`);
});

test("work law-firm — exhibit region", async ({ page }, testInfo) => {
  // the ownership-rule exhibit in the turn chapter.
  await prepare(page, "/work/law-firm/");
  const tag = testInfo.project.name;
  await expect(page.locator(".chapter:has(#turn)")).toHaveScreenshot(`work-lawfirm-turn-${tag}.png`);
});

test("work contact-centre — exhibit region", async ({ page }, testInfo) => {
  // the bad-data-rule exhibit in the kind-to-her-future-self chapter.
  await prepare(page, "/work/contact-centre/");
  const tag = testInfo.project.name;
  await expect(page.locator(".chapter:has(#safe)")).toHaveScreenshot(`work-contactcentre-safe-${tag}.png`);
});

test("study + /work tails — the final-thread→footer gap is the tight variant", async ({ page }, testInfo) => {
  // Studies and /work end on a short close, so they carry .thread-tight
  // (margin --space-md + a halved stitch) instead of the shared 268px tail.
  // Geometry, not a screenshot: the region snapshots never captured this gap.
  // /work now closes on its cta-band (2026-07 review fix), so its gap is
  // measured from the band, not the last chapter — same tight tail after it.
  // Asserted on chromium only — the clamp() maths is viewport-dependent.
  test.skip(testInfo.project.name !== "chromium", "gap asserted once, at the 1280×720 chromium viewport");
  for (const { path, anchor } of [
    { path: "/work/law-firm/", anchor: "main .chapter" },
    { path: "/work/", anchor: "main .cta-band" },
  ]) {
    await page.goto(path);
    const gap = await page.evaluate((sel) => {
      const nodes = document.querySelectorAll(sel);
      const last = nodes[nodes.length - 1].getBoundingClientRect();
      const main = document.querySelector("main")!.getBoundingClientRect();
      return Math.round(main.bottom - last.bottom);
    }, anchor);
    // --space-md (38) + clamp(2rem,5vw,4rem) thread (64) + talk-spacer (58) ≈ 160
    expect(gap, `${path} tail gap`).toBeGreaterThan(120);
    expect(gap, `${path} tail gap`).toBeLessThan(200);
  }
});

test("work — cta band region", async ({ page }, testInfo) => {
  // /work's closing action beat (2026-07 review: short pages ended in a dump
  // to the basement) — snapshot the band so the invite stack stays covered.
  await prepare(page, "/work/");
  const tag = testInfo.project.name;
  await expect(page.locator(".cta-band")).toHaveScreenshot(`work-cta-band-${tag}.png`);
});
