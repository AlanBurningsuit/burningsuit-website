import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./analytics";
import { builtPages, chunks } from "./helpers";

// axe-core on every built page (redirect stubs aside): every page at desktop width (1366px), plus phone width (390px)
// on every bespoke page and one representative per shared MDX template (/blog/, /writing/*, /work/*). Serious and
// critical violations fail; minor and moderate ones are axe's judgement calls and are left to review.
const failing = new Set(["serious", "critical"]);
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// First route in each shared template keeps the 390px check; every bespoke page keeps both widths.
const templateOf = (route: string) => {
  if (route.startsWith("/blog/")) return "blog";
  if (/^\/writing\/.+/.test(route)) return "writing";
  if (/^\/work\/.+/.test(route)) return "work";
  return null;
};
const seenTemplates = new Set<string>();
const mobileRoutes = new Set(
  builtPages
    .map(({ route }) => route)
    .filter((route) => {
      const template = templateOf(route);
      if (!template) return true;
      if (seenTemplates.has(template)) return false;
      seenTemplates.add(template);
      return true;
    }),
);

for (const [index, group] of chunks(builtPages, 4).entries()) {
  test(`axe finds no serious or critical violations (group ${index + 1})`, async ({ page }) => {
    test.slow();
    for (const { route } of group) {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const widths = mobileRoutes.has(route) ? [[1366, 900], [390, 844]] as const : [[1366, 900]] as const;
      for (const [width, height] of widths) {
        if (width !== 1366) await page.setViewportSize({ width, height });
        const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
        const serious = violations
          .filter((violation) => failing.has(violation.impact ?? ""))
          .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
        expect(serious, `${route} at ${width}px`).toEqual([]);
      }
    }
  });
}
