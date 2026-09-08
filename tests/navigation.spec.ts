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
    // Sample the surface under the outline, outside the focused element's
    // border. A whole cream panel sits on dark ground; an inset text link sits
    // on cream. Starting from the link itself would conflate these cases.
    const surroundingSurface = (node: Element | null) => {
      while (node) {
        const background = getComputedStyle(node).backgroundColor;
        if (background !== "transparent" && background !== "rgba(0, 0, 0, 0)") return background;
        node = node.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const offset = parseFloat(style.outlineOffset) + ring / 2;
    const points = [
      [box.left - offset, box.top + box.height / 2],
      [box.right + offset, box.top + box.height / 2],
      [box.left + box.width / 2, box.top - offset],
      [box.left + box.width / 2, box.bottom + offset],
    ];
    const surfaces = points.filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight)
      .map(([x, y]) => {
        const atPoint = document.elementFromPoint(x, y);
        return surroundingSurface(atPoint && !element.contains(atPoint) ? atPoint : element.parentElement);
      });
    const a = luminance(style.outlineColor);
    const contrasts = surfaces.map((surface) => {
      const b = luminance(surface);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    let visible = true;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const computed = getComputedStyle(node);
      if (computed.visibility !== "visible" || computed.display === "none" || Number(computed.opacity) !== 1) visible = false;
    }
    return {
      href: element.getAttribute("href"),
      footer: !!element.closest("footer"),
      visible,
      outline: style.outlineStyle !== "none" && ring >= 2,
      contrast: Math.min(...contrasts),
      surfaces,
      unobscured: !!topElement && (topElement === element || element.contains(topElement)),
      insideViewport: box.left - inset >= 0 && box.right + inset <= innerWidth && box.bottom + inset <= innerHeight && box.top - inset >= header.bottom,
    };
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 896, height: 414 },
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
    for (const href of expected.slice(0, -1).reverse()) {
      await page.keyboard.press("Shift+Tab");
      const state = await focusedLinkState(page);
      expect(state.href).toBe(href);
      expect(state.insideViewport).toBe(true);
      expect(state.unobscured).toBe(true);
      expect(state.outline).toBe(true);
      expect(state.contrast).toBeGreaterThanOrEqual(3);
    }
  });
}

test("header hides down, returns up, and returns through natural keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  const header = page.locator("header");
  await expect(header).toHaveClass(/hh/);
  await expect.poll(async () => (await header.boundingBox())!.y + (await header.boundingBox())!.height).toBeLessThanOrEqual(1);
  await page.mouse.wheel(0, -200);
  await expect(header).not.toHaveClass(/hh/);
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
  await page.mouse.wheel(0, 400);
  await expect(header).toHaveClass(/hh/);
  // Starting from the document, Tab reaches skip then logo; no programmatic focus.
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveClass(/skip/);
  await page.keyboard.press("Tab");
  expect(await page.locator(":focus").evaluate((el) => !!el.closest("header"))).toBe(true);
  await expect(header).not.toHaveClass(/hh/);
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  expect(await page.locator(":focus").evaluate((el) => !!el.closest("header"))).toBe(true);
  await expect(page.locator(":focus")).toBeInViewport({ ratio: 1 });
});

test("reduced motion keeps the header visible while scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await expect(page.locator("header")).not.toHaveClass(/hh/);
  expect((await page.locator("header").boundingBox())!.y).toBe(0);
  for (const link of await page.locator("header nav a").all()) await expect(link).toBeInViewport({ ratio: 1 });
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`evidence links have contrasting, visible focus with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/work/");
    const targets = page.locator(".offers a.panel");
    const expected = await targets.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    const reached: (string | null)[] = [];
    for (let step = 0; step < 100 && reached.length < expected.length; step++) {
      await page.keyboard.press("Tab");
      if (!await page.locator(":focus").evaluate((el) => el.matches(".offers a.panel"))) continue;
      const state = await focusedLinkState(page);
      expect(state.visible, `${state.href} and its ancestors are visible on focus`).toBe(true);
      expect(state.outline).toBe(true);
      expect(state.surfaces.length, "the outline has a sampled adjacent surface").toBeGreaterThan(0);
      expect(state.contrast, `${state.href} focus against ${state.surfaces.join(", ")}`).toBeGreaterThanOrEqual(3);
      expect(state.unobscured).toBe(true);
      reached.push(state.href);
    }
    expect(reached, "all evidence links are in the natural Tab order").toEqual(expected);
  });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 664 }, { width: 768, height: 1024 }, { width: 1280, height: 720 }, { width: 896, height: 414 }]) {
  test(`Power BI anchors clear the header at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const id of ["discovery", "pricing", "practical-ai"]) {
      await page.goto(`/power-bi/#${id}`);
      const heading = page.locator(`#${id}`);
      await expect(heading).toBeInViewport({ ratio: 1 });
      const header = (await page.locator("header").boundingBox())!;
      const target = (await heading.boundingBox())!;
      expect(target.y, `${id} starts below the sticky header`).toBeGreaterThanOrEqual(header.y + header.height);
    }
  });
}
