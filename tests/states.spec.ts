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
        if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) !== 1) {
          failures.push(`${element.tagName}: ${(element.textContent || element.getAttribute("alt") || "").trim().slice(0, 80)}`);
          break;
        }
        node = node.parentElement;
      }
    }
    return failures;
  });
  expect(hiddenContent, "reading content must not wait for scrolling or JavaScript").toEqual([]);
  // Static masks on .l are deliberate; hiding happens on the inner transform.
  await expectEndStateGeometry(page);
  const effects = await page.locator("[data-reveal], [data-reveal-lines], [data-reveal-raw], [data-reveal-fig], .enter, .lines .l > .i").evaluateAll((elements) => elements.map((el) => {
    const style = getComputedStyle(el);
    return { opacity: Number(style.opacity), visibility: style.visibility, display: style.display };
  }));
  for (const state of effects) {
    expect(state.opacity).toBe(1);
    expect(state.visibility).toBe("visible");
    expect(state.display).not.toBe("none");
  }
  await expect(page.locator('footer a[href^="mailto:"]')).toBeVisible();
  await expect(page.locator('footer a[href^="https://cal.com/"]')).toBeVisible();
}

/** The original geometry gate, including hero heading inners. No forced reveals. */
async function expectEndStateGeometry(page: Page) {
  for (const selector of [".l > .i", ".thread"]) {
    const transforms = await page.locator(selector).evaluateAll((elements) => elements.map((el) => getComputedStyle(el).transform));
    for (const transform of transforms) expect(transform, `${selector} must be un-translated and unscaled`).toBe("none");
  }
  const curtains = await page.locator("[data-reveal-fig] .ph, .photo-ch .ph").evaluateAll((elements) => elements.map((el) => getComputedStyle(el).clipPath));
  for (const clip of curtains) expect(clip, "photo curtain must be unclipped").toBe("none");
}

test("cream is reserved for evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".about .panel")).toHaveCount(0);
  await expect(page.locator(".about .about-door")).toHaveCount(1);
  const panels = page.locator(".chapter:has(#in-practice) .panel.casefile");
  await expect(panels).toHaveCount(1);
  expect(await panels.first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(241, 236, 217)");
  expect(await panels.first().locator("a").first().getAttribute("href")).not.toContain("law-firm");
  await page.goto("/about/");
  await expect(page.locator("main .panel")).toHaveCount(0);
  await page.goto("/work/");
  const tiles = page.locator(".offers a.panel");
  expect(await tiles.count()).toBeGreaterThan(0);
  for (const tile of await tiles.all()) expect(await tile.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(241, 236, 217)");
});

test("IntersectionObserver fallback exposes all reading content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => { delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver; });
  await page.goto("/power-bi/");
  await expectReadableContent(page);
});

test("print exposes all reading content and uses a static header", async ({ page }) => {
  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  await page.goto("/");
  await expectReadableContent(page);
  expect(await page.locator("header").evaluate((el) => getComputedStyle(el).position)).toBe("static");
});

test("contact controls have no entrance or reveal gates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const path of pages) {
    await page.goto(path);
    const gated = await page.locator('a[href^="mailto:"], a[href^="https://cal.com/"]').evaluateAll((links) => links.filter((link) => link.closest("[data-reveal], [data-reveal-lines], [data-reveal-raw], [data-reveal-fig], .enter, .lines")).map((link) => link.getAttribute("href")));
    expect(gated, `contact ancestors on ${path}`).toEqual([]);
  }
});

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
