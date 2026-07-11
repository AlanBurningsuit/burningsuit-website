import { test, expect, type Page } from "@playwright/test";

/**
 * Responsive functional spec — the phone/tablet class of regression the
 * region snapshots can't articulate: overflow, a lying --header-h token,
 * the conversion moment falling below the fold, stranded nav items, and
 * the keyboard entry path. Kept (not throwaway): these are the acceptance
 * criteria of the 2026-07 mobile rebuild.
 *
 * The width×height pairs cover both collapse boundaries (895/896 = the
 * 55.99rem rung at 16px root) and the small-phone floor.
 */
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 664 },
  { width: 390, height: 664 },
  { width: 768, height: 1024 },
  { width: 895, height: 800 },
  { width: 896, height: 800 },
];

const ROUTES = ["/", "/power-bi/", "/ai-fit-for-teams/", "/work/", "/about/", "/work/law-firm/"];

async function headerHeights(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const box = header!.getBoundingClientRect();
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue("--header-h")
      .trim();
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return { measured: box.height, budget: parseFloat(token) * rootPx };
  });
}

for (const vp of VIEWPORTS) {
  test(`layout holds at ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/");

    // no horizontal overflow anywhere on the page
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, "document wider than the viewport").toBeLessThanOrEqual(0);

    // the --header-h token must state the real (built, rendered) header height
    const { measured, budget } = await headerHeights(page);
    expect(measured, `header ${measured}px exceeds its --header-h budget ${budget}px`)
      .toBeLessThanOrEqual(budget);

    // no nav item stranded alone on its own row
    const rows = await page.evaluate(() => {
      const links = [...document.querySelectorAll("header nav a")];
      const byRow = new Map<number, number>();
      for (const a of links) {
        const top = Math.round(a.getBoundingClientRect().top);
        byRow.set(top, (byRow.get(top) ?? 0) + 1);
      }
      return [...byRow.values()];
    });
    expect(rows.length, "nav spread over more than two rows").toBeLessThanOrEqual(2);
    if (rows.length > 1) {
      for (const count of rows) {
        expect(count, "a nav item stranded alone on its row").toBeGreaterThan(1);
      }
    }

    // nav items don't overlap the logo or the CTA
    const overlaps = await page.evaluate(() => {
      const rects = [...document.querySelectorAll("header .bar a, header nav a")].map((el) =>
        el.getBoundingClientRect(),
      );
      let hits = 0;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (x > 1 && y > 1) hits++;
        }
      }
      return hits;
    });
    expect(overlaps, "header elements overlap").toBe(0);
  });
}

test("the conversion moment sits in the first viewport at 390×664", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto("/");
  const h1 = page.locator(".hero h1");
  const cta = page.locator(".hero .cta-row a").first();
  await expect(h1).toBeVisible();
  const h1Box = (await h1.boundingBox())!;
  const ctaBox = (await cta.boundingBox())!;
  // above the fold means fully inside the 664px first screen, unscrolled
  expect(h1Box.y + h1Box.height, "H1 falls below the first viewport").toBeLessThanOrEqual(664);
  expect(ctaBox.y + ctaBox.height, "primary CTA falls below the first viewport").toBeLessThanOrEqual(664);
});

test("skip link is the first tab stop and lands on #main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const first = page.locator(":focus");
  await expect(first).toHaveClass(/skip/);
  await expect(first).toHaveAttribute("href", "#main");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#main");
  await expect(page.locator("main#main")).toBeVisible();
});

for (const route of ROUTES.filter((r) => r !== "/")) {
  test(`current page is marked in the nav on ${route}`, async ({ page }) => {
    await page.goto(route);
    const current = page.locator("header nav a[aria-current]");
    await expect(current, `no aria-current nav item on ${route}`).toHaveCount(1);
    // child routes mark their section as an ancestor, exact pages as "page"
    const expected = ROUTES.includes(route) && route.split("/").filter(Boolean).length > 1
      ? "true"
      : "page";
    await expect(current).toHaveAttribute("aria-current", expected);
  });
}
