import { test, expect, type Page } from "@playwright/test";

const pages = ["/", "/ai-fit-for-teams/", "/power-bi/", "/about/", "/work/", "/work/law-firm/", "/privacy/"];

/** Check the reading surface before any scroll or class manipulation. */
async function expectReadableContent(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const hiddenContent = await page.locator("main").evaluate((main) => {
    const failures: string[] = [];
    const content = main.querySelectorAll("h1, h2, h3, p, li, img, h1 span, h2 span, h3 span");
    for (const element of content) {
      // Heading accessible names have a separate visually hidden copy.
      if (element.closest(".sr-only")) continue;
      let node: Element | null = element;
      while (node && node !== main.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || style.clipPath !== "none") {
          failures.push(`${element.tagName}: ${(element.textContent || element.getAttribute("alt") || "").trim().slice(0, 80)}`);
          break;
        }
        node = node.parentElement;
      }
    }
    return failures;
  });
  expect(hiddenContent, "reading content must not wait for scrolling or JavaScript").toEqual([]);
  await expect(page.locator('footer a[href^="mailto:"]')).toBeVisible();
  await expect(page.locator('footer a[href^="https://cal.com/"]')).toBeVisible();
}

for (const mode of [
  { name: "JavaScript disabled", javaScriptEnabled: false, reducedMotion: "no-preference" as const },
  { name: "reduced motion", javaScriptEnabled: true, reducedMotion: "reduce" as const },
  { name: "JavaScript disabled and reduced motion", javaScriptEnabled: false, reducedMotion: "reduce" as const },
]) {
  test.describe(mode.name, () => {
    test.use({ javaScriptEnabled: mode.javaScriptEnabled, contextOptions: { reducedMotion: mode.reducedMotion } });
    for (const path of pages) {
      test(`content is readable immediately: ${path}`, async ({ page }) => {
        await page.goto(path);
        await expectReadableContent(page);
      });
    }

    test("navigation and contact destinations remain usable", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Power BI", exact: true }).click();
      await expect(page).toHaveURL(/\/power-bi\/?$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const booking = new URL((await page.locator('footer a[href^="https://cal.com/"]').getAttribute("href"))!);
      expect(booking.hostname).toBe("cal.com");
      expect(booking.searchParams.get("utm_content")).toBe("footer");
      expect(await page.locator('footer a[href^="mailto:"]').getAttribute("href")).toMatch(/^mailto:alan@burningsuit\.co\.uk\?subject=.+/);
    });
  });
}

test("the privacy opt-out persists and can be undone", async ({ page }) => {
  await page.goto("/privacy/");
  const toggle = page.locator("[data-analytics-optout]");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("umami.disabled"))).toBeNull();
});
