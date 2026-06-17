import { test, expect } from "@playwright/test";

/**
 * The meta CSP must hold at runtime: no securitypolicyviolation events (fonts,
 * the inline script, styles, images all permitted by their hashes/sources) and
 * no console errors / uncaught page errors.
 */
const pages = ["/", "/ai-fit-for-teams/", "/power-bi/", "/about/"];

for (const path of pages) {
  test(`no CSP violations or console errors: ${path}`, async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) =>
        console.error(
          `CSP blocked ${e.violatedDirective}: ${e.blockedURI || e.sourceFile}`,
        ),
      );
    });
    await page.goto(path, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
