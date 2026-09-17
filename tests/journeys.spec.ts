import { test, expect } from "@playwright/test";

for (const [route, label] of [["/", "a free hour"], ["/power-bi/", "What happens in the free hour? ▸"]]) {
  test(`${route} offers the hour explanation in its hero`, async ({ page }) => {
    await page.goto(route);
    const hero = page.locator(".hero, .pbi-hero");
    await hero.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(/\/hour\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell me what your reporting can't do (yet).");
  });
}

test("Home's three situations open their matching practical detail", async ({ page }) => {
  for (const [id, heading] of [
    ["deliver", "Build and change your reporting"],
    ["skills", "Learn what the work needs"],
    ["handover", "Understand a system you inherited"],
  ]) {
    await page.goto("/");
    await page.getByRole("link", { name: `${heading} ▸`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/power-bi/#${id}$`));
    await expect(page.locator(`#${id}`).getByRole("heading", { name: heading })).toBeInViewport();
    await page.locator('.chapter[aria-labelledby="situations"]').getByRole("link", { name: "Tell me what your reporting can't do (yet) ▸" }).click();
    await expect(page).toHaveURL(/\/hour\/$/);
  }
});

test("the pricing destination contains the ongoing price guide", async ({ page }) => {
  await page.goto("/power-bi/#pricing");
  const chapter = page.locator('.chapter[aria-labelledby="pricing"]');
  await expect(chapter).toContainText("£3,000 to £6,000 a month excluding VAT");
  await expect(chapter.getByRole("heading", { name: "Ongoing support and prices" })).toBeInViewport();
});

for (const [label, id] of [["How we start", "start"], ["Ongoing prices", "pricing"]]) {
  test(`Power BI's hero offers a direct route to ${label.toLowerCase()}`, async ({ page }) => {
    await page.goto("/power-bi/");
    await page.locator(".pbi-hero").getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/power-bi/#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  });
}

test("Home's situation section gives a direct route to the introductory hour", async ({ page }) => {
  await page.goto("/");
  await page.locator('.chapter[aria-labelledby="situations"]').getByRole("link", { name: "Tell me what your reporting can't do (yet) ▸" }).click();
  await expect(page).toHaveURL(/\/hour\/$/);
});

test("Home's case-study action opens the complete collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "All four case studies ▸" }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator(".offers a.panel")).toHaveCount(4);
});

for (const [route, chapterId, study] of [
  ["/", "in-practice", "museum"],
  ["/power-bi/", "situations", "law-firm"],
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

test("each case study offers engagement details and a route to the price guide", async ({ page }) => {
  for (const study of ["contact-centre", "law-firm", "carbon-footprint", "museum"]) {
    await page.goto(`/work/${study}/`);
    const details = page.locator("[data-track-study-end]").getByRole("link", { name: "How we work together, and what it costs" });
    await expect(details).toHaveAttribute("href", "/power-bi/");
    await details.click();
    await expect(page).toHaveURL(/\/power-bi\/$/);
    await page.locator(".pbi-hero").getByRole("link", { name: "Ongoing prices", exact: true }).click();
    await expect(page).toHaveURL(/\/power-bi\/#pricing$/);
    await expect(page.locator('.chapter[aria-labelledby="pricing"]')).toContainText("£3,000 to £6,000 a month excluding VAT");
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
