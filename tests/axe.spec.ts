import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./analytics";
import { builtPages } from "./helpers";

// axe-core on every built page (redirect stubs aside) at desktop and phone widths. Serious and critical violations fail;
// minor and moderate ones are axe's judgement calls and are left to review.
const failing = new Set(["serious", "critical"]);

for (const { route } of builtPages) {
  for (const [width, height] of [[1366, 900], [390, 844]] as const) {
    test(`axe finds no serious or critical violations at ${width}px: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      const serious = violations
        .filter((violation) => failing.has(violation.impact ?? ""))
        .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
      expect(serious).toEqual([]);
    });
  }
}
