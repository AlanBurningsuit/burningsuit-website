import { test, expect } from "@playwright/test";

for (const route of ["/", "/power-bi/"]) {
  test(`${route} offers the hour explanation in its hero`, async ({ page }) => {
    await page.goto(route);
    const hero = page.locator(".hero, .pbi-hero");
    await hero.getByRole("link", { name: "What happens in the free hour? ▸" }).click();
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
  await expect(chapter.getByRole("heading", { name: "Support as the work develops" })).toBeInViewport();
});

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

test("the hour's full offer and contact actions fit the desktop first screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/hour/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hour-hero")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".hour-hero .cta-row")).toBeInViewport({ ratio: 1 });
});
