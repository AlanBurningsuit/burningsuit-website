import { test, expect } from "@playwright/test";

test("Home's hero leads to the training catalogue", async ({ page }) => {
  await page.goto("/");
  await page.locator(".hero .cta-row").getByRole("link", { name: /^See the courses$/ }).click();
  await expect(page).toHaveURL(/\/training\/$/);
  await expect(page.locator("#agentic-101")).toBeAttached();
});

test("the training catalogue carries every course at a stable anchor", async ({ page }) => {
  await page.goto("/training/");
  for (const id of ["agentic-101", "agentic-hands-on", "modelling-for-agents", "power-bi-fundamentals", "dax-fundamentals", "dax-deep-dive", "data-modelling", "claude-day-job", "claude-consultants", "how-the-courses-run"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.locator('.cta-band a.cta[href^="mailto:"]')).toBeVisible();
});

// Training prices render only from the private ops file with
// SHOW_TRAINING_PRICES set at build time. CI never sets it, so its build must
// carry no training figure.
test("the default build shows no training price, and says how to get one", async ({ page }) => {
  test.skip(process.env.SHOW_TRAINING_PRICES === "true", "priced build");
  for (const [route, howToGetIt] of [
    ["/", "founding rate"],
    ["/training/", "outline with costs"],
    ["/training/agentic-101/", "founding rate"],
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).not.toContainText("£");
    await expect(page.locator("main")).toContainText(howToGetIt);
  }
});

test("Power BI offers the hour explanation in its hero", async ({ page }) => {
  await page.goto("/power-bi/");
  await page.locator(".pbi-hero").getByRole("link", { name: /^What happens in the free hour\?/ }).click();
  await expect(page).toHaveURL(/\/hour\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A free hour on a call, for when your reporting is stuck.");
});

test("Home's consultancy door opens the consultancy page", async ({ page }) => {
  await page.goto("/");
  await page.locator('.chapter[aria-labelledby="consultancy"] a.door').click();
  await expect(page).toHaveURL(/\/power-bi\/$/);
  await expect(page.locator('header nav a[aria-current="page"]')).toHaveText("Consultancy");
});

// No consultancy price is a public claim (claims ledger, 28 Oct 2026): the
// pricing destination explains the fixed-price quote and carries no figure.
test("the pricing destination says how consultancy is priced, with no figure", async ({ page }) => {
  await page.goto("/power-bi/#pricing");
  const chapter = page.locator('.chapter[aria-labelledby="pricing"]');
  await expect(chapter).toContainText("fixed price");
  await expect(chapter).not.toContainText("£");
  await expect(chapter.getByRole("heading", { name: "What it costs" })).toBeInViewport();
});

test("Power BI's hero routes only to the free hour, never to in-page anchors", async ({ page }) => {
  await page.goto("/power-bi/");
  const heroLinks = page.locator(".pbi-hero a[href^='#']");
  await expect(heroLinks).toHaveCount(0);
  for (const id of ["start", "discovery", "pricing"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
});

test("Home's consultancy section gives a direct route to the introductory hour", async ({ page }) => {
  await page.goto("/");
  await page.locator('.chapter[aria-labelledby="consultancy"]').getByRole("link", { name: /^Tell me what your reporting can't do \(yet\)/i }).click();
  await expect(page).toHaveURL(/\/hour\/$/);
});

test("no link copy carries a typed arrow: the route glyph is CSS furniture", async ({ page }) => {
  for (const route of ["/", "/power-bi/", "/work/museum/", "/writing/we-are-all-middle-management-now/", "/404"]) {
    await page.goto(route);
    const typed = await page.locator("a").evaluateAll((links) => links.filter((a) => /▸\s*$/.test(a.textContent ?? "")).map((a) => a.textContent?.trim()));
    expect(typed, `${route} has a typed arrow in link copy`).toEqual([]);
    await expect(page.locator("a.route").first()).toBeVisible();
  }
});

test("Home's case-study action opens the complete collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^All four case studies/ }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator(".offers a.panel")).toHaveCount(4);
});

for (const [route, chapterId, study] of [
  ["/", "in-practice", "museum"],
  ["/power-bi/", "proof", "law-firm"],
]) {
  test(`${route} links its visible exhibit to the ${study} story`, async ({ page }) => {
    await page.goto(route);
    const chapter = page.locator(`.chapter[aria-labelledby="${chapterId}"]`);
    await expect(chapter.locator(".exhibit")).toBeVisible();
    await chapter.locator(`a[href="/work/${study}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`/work/${study}/$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("each case study offers engagement details and a route to how consultancy is priced", async ({ page }) => {
  for (const study of ["contact-centre", "law-firm", "carbon-footprint", "museum"]) {
    await page.goto(`/work/${study}/`);
    const details = page.locator("[data-track-study-end]").getByRole("link", { name: "How we work together, and what it costs" });
    await expect(details).toHaveAttribute("href", "/power-bi/");
    await details.click();
    await expect(page).toHaveURL(/\/power-bi\/$/);
    const pricing = page.locator('.chapter[aria-labelledby="pricing"]');
    await pricing.scrollIntoViewIfNeeded();
    await expect(pricing).toContainText("fixed price");
  }
});

test("the essay leads on to About, never to the law-firm study", async ({ page }) => {
  await page.goto("/writing/we-are-all-middle-management-now/");
  // The essay and the law-firm study must stay apart (a permanent claims rule),
  // so the essay's only in-body exit is About, not the Power BI page that
  // carries the law-firm exhibit.
  await expect(page.locator('main a[href="/work/law-firm/"]')).toHaveCount(0);
  await expect(page.locator('main a[href="/power-bi/#ai"]')).toHaveCount(0);
  await page.locator('main a[href="/about/"]').click();
  await expect(page).toHaveURL(/\/about\/$/);
});

test("the hour's full offer and contact actions fit the desktop first screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/hour/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hour-hero")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".hour-hero .cta-row")).toBeInViewport({ ratio: 1 });
});
