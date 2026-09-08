import { test, expect } from "@playwright/test";

test("each Home situation leads through Power BI to the hour", async ({ page }) => {
  for (const id of ["skills", "deliver", "handover", "second-opinion", "backup"]) {
    await page.goto("/");
    await page.locator(`a[href="/power-bi/#${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/power-bi/#${id}$`));
    const situation = page.locator(`#${id}`);
    await expect(situation.locator("h3")).toBeInViewport();
    await situation.getByRole("link", { name: "Tell me what your reporting can't do (yet) ▸" }).click();
    await expect(page).toHaveURL(/\/hour\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell me what your reporting can't do (yet).");
  }
});

test("the hour's full offer and contact actions fit the desktop first screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/hour/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hour-hero")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".hour-hero .cta-row")).toBeInViewport({ ratio: 1 });
});
