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

// Exercise natural entry and return across the main/footer boundary.
for (const mode of ["normal", "reduce", "no-js"] as const) {
  test.describe(`footer navigation with ${mode}`, () => {
    test.use({
      contextOptions: { reducedMotion: mode === "reduce" ? "reduce" : "no-preference" },
      javaScriptEnabled: mode !== "no-js",
    });
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 844, height: 390 },
      { width: 896, height: 414 },
      { width: 320, height: 568 },
      { width: 640, height: 360 },
    ]) {
      test(`natural footer focus is visible at ${viewport.width}×${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        // Long, medium and short documents exercise both sides of the seam.
        for (const route of ["/", "/power-bi/", "/hour/"]) {
          const open = async () => {
            await page.goto(route);
            await page.evaluate(() => document.fonts.ready);
          };
          const checkFocus = async (href: string | null, observed?: Awaited<ReturnType<typeof focusedLinkState>>) => {
            // One immediate read: polling could hide a transient covered focus.
            const state = observed ?? await focusedLinkState(page);
            expect(state.href).toBe(href);
            expect(state.visible, `${route} ${href} is opaque`).toBe(true);
            expect(state.insideViewport, `${route} ${href} and its ring fit below the header`).toBe(true);
            expect(state.unobscured, `${route} ${href} is above the opaque main`).toBe(true);
            expect(state.outline).toBe(true);
            expect(state.contrast).toBeGreaterThanOrEqual(3);
          };
          await open();
          const expected = await page.locator("footer a").evaluateAll(links => links.map(link => link.getAttribute("href")));
          const reached: (string | null)[] = [];
          for (let step = 0; step < 160 && reached.length < expected.length; step++) {
            await page.keyboard.press("Tab");
            const state = await focusedLinkState(page);
            if (!state.footer) continue;
            await checkFocus(expected[reached.length], state);
            reached.push(state.href);
          }
          expect(reached).toEqual(expected);
          // A fresh document's Shift+Tab enters the last footer action while
          // the footer is still covered, then crosses into main and back.
          await open();
          for (const href of expected.slice().reverse()) {
            await page.keyboard.press("Shift+Tab");
            await checkFocus(href);
          }
          await page.keyboard.press("Shift+Tab");
          expect(await page.locator(":focus").evaluate(el => !!el.closest("main"))).toBe(true);
          const seam = await focusedLinkState(page);
          // A whole linked teaser can be taller than the usable viewport.
          // Require its visible portion and focus ring to be exposed; retain
          // full containment for ordinary links that are small enough to fit.
          // Inline links may wrap, so hit-test their real line rectangles,
          // not the whitespace at the center of their combined bounding box.
          const fragment = await page.locator(":focus").evaluate(el => {
            const box = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
            const headerBottom = Math.max(0, document.querySelector("header")!.getBoundingClientRect().bottom);
            const visible = [...el.getClientRects()].some(rect => {
              const left = Math.max(0, rect.left);
              const right = Math.min(innerWidth, rect.right);
              const top = Math.max(headerBottom, rect.top);
              const bottom = Math.min(innerHeight, rect.bottom);
              if (right - left < Math.min(24, rect.width) || bottom - top < Math.min(24, rect.height)) return false;
              const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
              return !!hit && (hit === el || el.contains(hit));
            });
            return {
              visible,
              fitsAvailableHeight: box.height + 2 * ring <= innerHeight - headerBottom,
              sideOutlinesFit: box.left - ring >= 0 && box.right + ring <= innerWidth,
            };
          });
          expect(seam.visible).toBe(true);
          expect(seam.outline).toBe(true);
          expect(seam.surfaces.length).toBeGreaterThan(0);
          expect(seam.contrast).toBeGreaterThanOrEqual(3);
          expect(fragment.sideOutlinesFit).toBe(true);
          expect(fragment.visible, `${route} exposes a real focused link fragment below the header`).toBe(true);
          if (fragment.fitsAvailableHeight) expect(seam.insideViewport).toBe(true);
          await page.keyboard.press("Tab");
          await checkFocus(expected[0]);
        }
      });
    }
  });
}

test("header hides down, returns up, and returns through natural keyboard focus", async ({ page }) => {
  const expectImmediateHeaderFocus = async () => {
    // Read once immediately after the key. Polling would allow an offscreen
    // focused link to animate back before the assertion and miss the defect.
    const state = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      const box = active.getBoundingClientRect();
      const style = getComputedStyle(active);
      const ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        inHeader: !!active.closest("header"),
        headerTop: document.querySelector("header")!.getBoundingClientRect().top,
        ringTop: box.top - ring,
        ringBottom: box.bottom + ring,
        viewportHeight: innerHeight,
        unobscured: !!top && (top === active || active.contains(top)),
      };
    });
    expect(state.inHeader).toBe(true);
    expect(state.headerTop, "focus must expose the header immediately").toBe(0);
    expect(state.ringTop, "the focused control's ring is not above the viewport").toBeGreaterThanOrEqual(0);
    expect(state.ringBottom).toBeLessThanOrEqual(state.viewportHeight);
    expect(state.unobscured).toBe(true);
  };
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
  await expectImmediateHeaderFocus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expectImmediateHeaderFocus();

  // Reach the first content link naturally, hide the header, then Shift+Tab
  // straight into its booking control while it is fully offscreen.
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press("Tab");
    if (await page.locator(":focus").evaluate((el) => !!el.closest("main"))) break;
  }
  expect(await page.locator(":focus").evaluate((el) => !!el.closest("main"))).toBe(true);
  await page.mouse.wheel(0, 1400);
  await expect(header).toHaveClass(/hh/);
  await expect.poll(async () => (await header.boundingBox())!.y + (await header.boundingBox())!.height).toBeLessThanOrEqual(1);
  await page.keyboard.press("Shift+Tab");
  await expectImmediateHeaderFocus();
  await expect(page.locator(":focus")).toHaveAttribute("href", /utm_content=header/);
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

for (const motion of ["reduce", "no-preference"] as const) {
for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 664 }, { width: 768, height: 1024 }, { width: 1280, height: 720 }, { width: 896, height: 414 }, { width: 844, height: 390 }]) {
  test(`Power BI anchors clear the header with ${motion} at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: motion });
    for (const id of ["discovery", "pricing", "ai", "skills", "deliver", "handover", "second-opinion", "backup"]) {
      await page.goto(`/power-bi/#${id}`);
      await page.evaluate(() => document.fonts.ready);
      const destination = page.locator(`#${id}`);
      expect(await destination.evaluate(el => getComputedStyle(el).transform), `${id} must not move after the hash scroll`).toBe("none");
      const heading = await destination.locator("h3").count() ? destination.locator("h3") : destination;
      await expect(heading).toBeInViewport({ ratio: 1 });
      const header = (await page.locator("header").boundingBox())!;
      const target = (await heading.boundingBox())!;
      expect(target.y, `${id} starts below the sticky header`).toBeGreaterThanOrEqual(header.y + header.height);
    }
  });
}
}
