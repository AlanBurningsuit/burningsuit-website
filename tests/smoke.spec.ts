import { test, expect } from "./analytics";
import { builtPages, watchPage } from "./helpers";

// The cross-browser smoke subset, tagged @smoke: the WebKit project runs only these, and Chromium (which runs the full
// suite) leaves them out. Keep it small: each page loads cleanly with its shell, and the two interactive parts work.
const smoke = { tag: "@smoke" };
const navigation = ["Training", "Consultancy", "Case studies", "About", "Contact"];

for (const { route } of builtPages) {
  test(`page loads with one h1, the masthead links and no console errors: ${route}`, smoke, async ({ page }) => {
    const watch = await watchPage(page);
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link")).toHaveText(navigation);
    watch.expectClean();
  });
}

test("the Training menu opens and lists the course pages", smoke, async ({ page }) => {
  const watch = await watchPage(page);
  await page.goto("/");
  const menu = page.locator(".nav-menu");
  await expect(menu).not.toHaveAttribute("open", /.*/);
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(menu.getByRole("link")).toHaveText(["Power BI fundamentals", "Power BI with AI agents 101", "DAX fundamentals", "DAX deep dive", "How I train"]);
  await expect(menu.getByRole("link").first()).toBeVisible();
  watch.expectClean();
});

test("the enquiry form's fields are present", smoke, async ({ page }) => {
  const watch = await watchPage(page);
  await page.goto("/contact/");
  const form = page.getByRole("form");
  for (const label of ["Name (optional)", "Email", "Your message"]) await expect(form.getByLabel(label, { exact: true })).toBeVisible();
  await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute("required", "");
  await expect(form.getByRole("button", { name: /send/i })).toBeVisible();
  watch.expectClean();
});
