import { test, expect } from "@playwright/test";

/**
 * State gates: the page must be complete and readable with JS disabled, and
 * nothing may stay hidden under reduced motion. These are functional assertions
 * (computed opacity, visibility, fallback grounds), not pixel comparisons.
 */
const pages = ["/", "/ai-fit-for-teams/", "/power-bi/"];

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
      // the footer mailto (the contact path) is present and visible
      await expect(page.locator("a.mail")).toBeVisible();
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
    });
  }
});
