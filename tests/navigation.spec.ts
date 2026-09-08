import { test, expect, type Page } from "@playwright/test";

async function focusedLinkState(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const ring = parseFloat(style.outlineWidth);
    const inset = ring + parseFloat(style.outlineOffset);
    const topElement = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    const header = document.querySelector("header")!.getBoundingClientRect();
    const luminance = (colour: string) => {
      const channels = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    // The outline is outside the link, so compare with the surrounding surface.
    let parent = element.parentElement;
    let surface = "rgb(255, 255, 255)";
    while (parent) {
      const background = getComputedStyle(parent).backgroundColor;
      if (background !== "transparent" && background !== "rgba(0, 0, 0, 0)") {
        surface = background;
        break;
      }
      parent = parent.parentElement;
    }
    const a = luminance(style.outlineColor);
    const b = luminance(surface);
    return {
      href: element.getAttribute("href"),
      footer: !!element.closest("footer"),
      visible: style.visibility === "visible" && Number(style.opacity) === 1,
      outline: style.outlineStyle !== "none" && ring >= 2,
      contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      unobscured: !!topElement && (topElement === element || element.contains(topElement)),
      insideViewport: box.left - inset >= 0 && box.right + inset <= innerWidth && box.bottom + inset <= innerHeight && box.top - inset >= header.bottom,
    };
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 320, height: 568 },
  // 1280×720 at 200% browser zoom has this effective CSS viewport.
  { width: 640, height: 360 },
]) {
  test(`Tab reaches every footer action unobscured at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const expected = await page.locator("footer a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    const reached: (string | null)[] = [];
    // Start at the document, never focus or scroll the footer programmatically.
    for (let step = 0; step < 100 && reached.length < expected.length; step++) {
      await page.keyboard.press("Tab");
      const state = await focusedLinkState(page);
      if (!state.footer) continue;
      expect(state.visible, `${state.href} is visible`).toBe(true);
      expect(state.insideViewport, `${state.href} and its focus ring fit below the header`).toBe(true);
      expect(state.unobscured, `${state.href} is not covered by other content`).toBe(true);
      expect(state.outline, `${state.href} has a visible focus ring`).toBe(true);
      expect(state.contrast, `${state.href} focus ring contrast`).toBeGreaterThanOrEqual(3);
      reached.push(state.href);
    }
    expect(reached, "all footer actions must be reachable in document order").toEqual(expected);
  });
}

test("navigation stays available while scrolling down", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  for (const link of await page.locator("header nav a").all()) {
    await expect(link).toBeInViewport({ ratio: 1 });
  }
  const headerBox = (await page.locator("header").boundingBox())!;
  expect(headerBox.y, "the header must stay at the top of the screen").toBe(0);
});

test("links inside cream evidence panels have a contrasting focus ring", async ({ page }) => {
  await page.goto("/power-bi/");
  const target = page.locator(".panel a").first();
  const targetHref = await target.getAttribute("href");
  let reached = false;
  for (let step = 0; step < 100; step++) {
    await page.keyboard.press("Tab");
    const onTarget = await target.evaluate((element) => element === document.activeElement);
    if (!onTarget) continue;
    const state = await focusedLinkState(page);
    expect(state.outline).toBe(true);
    expect(state.contrast, `${targetHref} focus against cream`).toBeGreaterThanOrEqual(3);
    expect(state.unobscured).toBe(true);
    reached = true;
    break;
  }
  expect(reached, "the evidence link is in the natural Tab order").toBe(true);
});
