import { test, expect } from "@playwright/test";

test("Home explains the work, then leads through Power BI to the introductory hour", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How I work with teams ▸" }).click();
  await expect(page).toHaveURL(/\/power-bi\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Working alongside your Power BI team.");
  await page.getByRole("link", { name: "About the free hour ▸" }).click();
  await expect(page).toHaveURL(/\/hour\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell me what your reporting can't do (yet).");
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
