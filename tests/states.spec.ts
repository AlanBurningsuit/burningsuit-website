import { test, expect } from "@playwright/test";

/**
 * State gates: the page must be complete and readable with JS disabled, and
 * nothing may stay hidden under reduced motion. These are functional assertions
 * (computed opacity, visibility, fallback grounds), not pixel comparisons.
 */
const pages = ["/", "/ai-fit-for-teams/", "/power-bi/", "/about/", "/work/", "/work/law-firm/"];

/**
 * Geometric visibility per hide MECHANISM. Opacity only covers [data-reveal];
 * the other three mechanisms (masked-line translate, thread scale, photo
 * curtain clip) never touch opacity, so an opacity-only pass is vacuous for
 * them — notably the html:not(.js) counter-rule that is the single point of
 * no-JS readability for every masked heading.
 */
async function expectEndStateGeometry(page: import("@playwright/test").Page, path: string) {
  const lineInners = page.locator("[data-reveal-lines] .l > .i");
  for (let i = 0, n = await lineInners.count(); i < n; i++) {
    const transform = await lineInners.nth(i).evaluate((el) => getComputedStyle(el).transform);
    expect(transform, `masked line #${i} on ${path} must be un-translated`).toBe("none");
  }
  const threads = page.locator(".thread");
  for (let i = 0, n = await threads.count(); i < n; i++) {
    const transform = await threads.nth(i).evaluate((el) => getComputedStyle(el).transform);
    expect(transform, `thread #${i} on ${path} must be unscaled`).toBe("none");
  }
  const curtains = page.locator("[data-reveal-fig] .ph, .photo-ch .ph");
  for (let i = 0, n = await curtains.count(); i < n; i++) {
    const clip = await curtains.nth(i).evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip, `photo curtain #${i} on ${path} must be un-clipped`).toBe("none");
  }
}

test.describe("no-JS: everything is visible, nothing reveal-hidden", () => {
  test.use({ javaScriptEnabled: false });

  for (const path of pages) {
    test(`no-JS content shows: ${path}`, async ({ page }) => {
      await page.goto(path);
      // every reveal target must be fully opaque without the .js gate
      const reveals = page.locator("[data-reveal], [data-reveal-lines]");
      const count = await reveals.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const opacity = await reveals.nth(i).evaluate((el) =>
          parseFloat(getComputedStyle(el).opacity),
        );
        expect(opacity, `reveal #${i} on ${path} must be visible without JS`).toBe(1);
      }
      // …and the three non-opacity mechanisms must be at their visible state.
      await expectEndStateGeometry(page, path);
      // the footer contact path (the email link) is present and visible without JS
      await expect(page.locator('footer a[href^="mailto:"]')).toBeVisible();
    });
  }

  test("no-JS: the about teaser sits on a cream entry panel", async ({ page }) => {
    await page.goto("/");
    const bg = await page
      .locator(".about .panel")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // #f1ecd9 — the Everforest-light cream paper surface (set in CSS, no JS)
    expect(bg).toBe("rgb(241, 236, 217)");
  });
});

test.describe("reduced motion: the revealed state is visible", () => {
  // project-level reducedMotion: 'reduce' is set in the config. The invariant
  // that matters under reduced motion is that the IntersectionObserver's `.show`
  // state actually yields opaque content — i.e. the reduced-motion CSS didn't
  // forget to un-hide anything. (That `.show` fires on scroll is plain JS,
  // exercised by real use and the visual specs; here we force it and assert the
  // end state, which is deterministic and not at the mercy of scroll geometry.)
  for (const path of pages) {
    test(`reduced-motion revealed content is opaque: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        // Disable each element's transition/animation FIRST (via CSSOM property
        // writes — style-src does NOT govern those, so the meta-CSP can't block
        // them the way it blocks an injected <style>), then reveal: opacity:1
        // applies with no transition to race or cancel. This tests the invariant
        // "nothing stays reveal-hidden" — the .show end-state — independent of
        // transition timing and of the staggered delays that otherwise race a
        // fixed wait on the longest page.
        document
          .querySelectorAll(
            "[data-reveal], [data-reveal-lines], [data-reveal-raw], [data-reveal-fig]",
          )
          .forEach((el) => {
            const s = el as HTMLElement;
            s.style.transition = "none";
            s.style.animation = "none";
            s.classList.add("show");
          });
      });
      await page.waitForTimeout(50);
      const reveals = page.locator("[data-reveal], [data-reveal-lines]");
      const count = await reveals.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const opacity = await reveals.nth(i).evaluate((el) =>
          parseFloat(getComputedStyle(el).opacity),
        );
        expect(opacity, `revealed #${i} on ${path} not opaque under reduced motion`).toBe(1);
      }
      // …and the reduced-motion CSS must hold the non-opacity mechanisms at
      // their visible end-state too (designed system, not a kill switch).
      await expectEndStateGeometry(page, path);
    });
  }
});
