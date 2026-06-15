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

  test("no-JS: principles chapter keeps its magenta fallback ground", async ({ page }) => {
    await page.goto("/");
    const bg = await page
      .locator(".principles-ch")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // #D90148
    expect(bg).toBe("rgb(217, 1, 72)");
  });
});

test.describe("reduced motion: reveals settle visible", () => {
  // project-level reducedMotion: 'reduce' is already set in the config
  for (const path of pages) {
    test(`reduced-motion reveals end visible: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // scroll through so every IntersectionObserver reveal fires
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.6);
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 80));
        }
      });
      const reveals = page.locator("[data-reveal], [data-reveal-lines]");
      const count = await reveals.count();
      for (let i = 0; i < count; i++) {
        const opacity = await reveals.nth(i).evaluate((el) =>
          parseFloat(getComputedStyle(el).opacity),
        );
        expect(opacity, `reveal #${i} on ${path} stuck hidden under reduced motion`).toBe(1);
      }
    });
  }
});
