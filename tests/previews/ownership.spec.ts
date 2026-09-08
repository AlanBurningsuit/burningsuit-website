import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const directions = ["elevated", "personal"];
const pages = ["", "power-bi/"];
// Keep review captures outside Playwright's transient output directory: a
// subsequent functional/visual run must not delete the deliverable.
const captures = ".preview-review";
const sizes = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 640, height: 360 }, // 1280×720 at 200% effective CSS viewport
];

for (const direction of directions) {
  for (const suffix of pages) {
    const name = suffix ? "power-bi" : "home";
    const path = `/design-preview/${direction}/${suffix}`;

    test(`${direction} ${name}: responsive reading and captures`, async ({ page }) => {
      await mkdir(captures, { recursive: true });
      for (const viewport of sizes) {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("h1")).toBeVisible();
        const layout = await page.evaluate(() => {
          const hidden: string[] = [];
          for (const element of document.querySelectorAll("main h1, main h2, main h3, main p, main img")) {
            const style = getComputedStyle(element);
            if (style.visibility !== "visible" || style.opacity === "0" || style.display === "none") hidden.push(element.tagName);
          }
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, hidden };
        });
        expect(layout.scrollWidth, `${viewport.width}px must not scroll sideways`).toBeLessThanOrEqual(layout.width);
        expect(layout.hidden).toEqual([]);
        // No imperative footer focusing or scrolling: follow the user's Tab sequence.
        const expected = await page.locator("footer a").count();
        let found = 0;
        for (let step = 0; step < 75 && found < expected; step++) {
          await page.keyboard.press("Tab");
          const state = await page.evaluate(() => {
            const active = document.activeElement as HTMLElement;
            if (!active.closest("footer")) return null;
            const rect = active.getBoundingClientRect();
            const style = getComputedStyle(active);
            const under = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            const headerBottom = document.querySelector("header")!.getBoundingClientRect().bottom;
            return { top: rect.top, bottom: rect.bottom, headerBottom, height: innerHeight, outline: style.outlineStyle, clear: under === active || active.contains(under) };
          });
          if (!state) continue;
          found++;
          expect(state.top).toBeGreaterThanOrEqual(state.headerBottom);
          expect(state.bottom).toBeLessThanOrEqual(state.height);
          expect(state.outline).not.toBe("none");
          expect(state.clear).toBe(true);
        }
        expect(found).toBe(expected);
        if (viewport.width === 1440 || viewport.width === 390) {
          for (const image of await page.locator("main img").all()) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(async (img: HTMLImageElement) => { if (!img.complete) await img.decode(); });
            expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth), "the real photograph must load").toBeGreaterThan(0);
          }
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
          await page.evaluate(() => scrollTo(0, 0));
          const device = viewport.width === 1440 ? "desktop" : "mobile";
          await page.screenshot({ path: `${captures}/${direction}-${name}-${device}.png`, fullPage: true });
          await page.screenshot({ path: `${captures}/${direction}-${name}-${device}-opening.png` });
        }
      }
    });

    test(`${direction} ${name}: works without JavaScript`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4322${path}`);
      await expect(page.locator("main h1")).toBeVisible();
      const mail = page.locator('.o-hero a[href^="mailto:"]');
      await expect(mail).toHaveAttribute("href", /mailto:alan@burningsuit\.co\.uk\?subject=Power%20BI/);
      await expect(page.locator('footer a[href^="https://cal.com/"]')).toHaveAttribute("href", /utm_content=footer/);
      await page.getByRole("navigation", { name: "Preview pages" }).getByRole("link", { name: suffix ? "Home" : "Power BI", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/design-preview/${direction}/${suffix ? "$" : "power-bi/$"}`));
      await expect(page.locator("main h1")).toBeVisible();
      await context.close();
    });
  }
}

test("the comparison changes design without changing content or contact attribution", async ({ page }) => {
  for (const suffix of pages) {
    const texts: string[] = [];
    const contacts: string[][] = [];
    for (const direction of directions) {
      await page.goto(`/design-preview/${direction}/${suffix}`);
      texts.push((await page.locator("main").innerText()).replace(/\s+/g, " ").trim());
      contacts.push(await page.locator('a[href^="mailto:"], a[href^="https://cal.com/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")!)));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    }
    expect(texts[0]).toBe(texts[1]);
    expect(contacts[0]).toEqual(contacts[1]);
  }
});
