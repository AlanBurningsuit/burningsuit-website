// These tests inject neither footer CSS nor footer behavior.
import { test, expect } from "@playwright/test";

const footerViewports = [
  { width: 1280, height: 720 }, { width: 844, height: 390 },
  { width: 896, height: 414 }, { width: 320, height: 568 },
  { width: 640, height: 360 },
];

test.describe("sticky footer", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  for (const viewport of footerViewports) {
    test(`footer reveals and remains readable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const mainEnd = await page.locator("main").evaluate(el => el.getBoundingClientRect().bottom + scrollY);
      const stages = [];
      for (const fraction of [0.85, 0.25]) {
        await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), mainEnd - viewport.height * fraction);
        await page.waitForTimeout(100);
        stages.push(await page.evaluate(() => {
          const footer = document.querySelector("footer")!;
          const hit = document.elementFromPoint(innerWidth / 2, innerHeight * 0.75);
          return { top: footer.getBoundingClientRect().top, position: getComputedStyle(footer).position, footerHit: !!hit?.closest("footer") };
        }));
      }
      expect(stages[0].position).toBe("sticky");
      expect(stages[1].position).toBe("sticky");
      expect(Math.abs(stages[1].top - stages[0].top), "the footer stays still while main uncovers it").toBeLessThanOrEqual(1);
      expect(stages[0].footerHit).toBe(false);
      expect(stages[1].footerHit).toBe(true);
      // Bottom-only sticky used to lose this heading on every short viewport.
      await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), mainEnd - 8);
      await expect.poll(() => page.locator("footer h2").evaluate(el => {
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.top >= 0 && box.bottom <= innerHeight && (hit === el || el.contains(hit));
      })).toBe(true);
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await expect(page.locator("footer .lockup img")).toBeInViewport({ ratio: 1 });
      expect(await page.locator("footer .lockup img").evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(viewport.width * 0.8);
      await page.emulateMedia({ media: "print" });
      expect(await page.locator("footer").evaluate(el => getComputedStyle(el).position)).toBe("static");
    });
  }
  for (const route of ["/", "/power-bi/"]) {
    test(`footer enhancement causes no mobile layout shift on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 664 });
      await page.addInitScript(() => {
        const state = window as Window & { footerLayoutShifts?: number[] };
        state.footerLayoutShifts = [];
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) state.footerLayoutShifts!.push(shift.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => (window as Window & { footerLayoutShifts?: number[] }).footerLayoutShifts!.reduce((sum, value) => sum + value, 0))).toBe(0);
      // Also require the actual mobile Lighthouse reports to report CLS 0;
      // this browser assertion is not a substitute for the Lighthouse gate.
    });
  }
});

for (const mode of ["reduce", "no-js"] as const) {
  test.describe(`static footer with ${mode}`, () => {
    test.use({ contextOptions: { reducedMotion: mode === "reduce" ? "reduce" : "no-preference" }, javaScriptEnabled: mode !== "no-js" });
    test("the footer is in its normal position before any interaction", async ({ page }) => {
      await page.goto("/");
      const state = await page.locator("footer").evaluate(el => {
        const style = getComputedStyle(el);
        return { position: style.position, opacity: style.opacity, visibility: style.visibility, top: el.getBoundingClientRect().top, mainBottom: document.querySelector("main")!.getBoundingClientRect().bottom };
      });
      expect(state.position).toBe("static");
      expect(state.opacity).toBe("1");
      expect(state.visibility).toBe("visible");
      expect(state.top).toBeGreaterThanOrEqual(state.mainBottom - 1);
    });
  });
}
