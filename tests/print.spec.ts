import { test, expect } from "./analytics";

// A course page is forwarded to whoever approves the spend: in print the dark title stage becomes dark text on the
// paper, the form's fields and Send go, and the course facts with their price slot stay.
test("A course page prints as dark text on paper, without the form's fields", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  await page.goto("/training/power-bi-fundamentals/");
  const title = page.locator("h1");
  await expect(title).toBeVisible();
  // Every ground behind the title is cleared, so it sits on the (white) paper; its own text is dark.
  const grounds = await title.evaluate((el) => {
    const out: string[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) out.push(getComputedStyle(node).backgroundColor);
    return out;
  });
  expect(grounds.every((colour) => colour === "rgba(0, 0, 0, 0)")).toBe(true);
  const luminance = await title.evaluate((el) => {
    const [r, g, b] = getComputedStyle(el).color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  expect(luminance).toBeLessThan(0.3);
  // The form's fields and Send are hidden; its heading and the email line stay.
  for (const selector of ["#enquiry-name", "#enquiry-email", "#enquiry-message", ".enquiry-form .send"]) await expect(page.locator(selector)).toBeHidden();
  await expect(page.locator("#contact-title")).toBeVisible();
  await expect(page.locator(".enquiry .fallback")).toBeVisible();
  // The skip link and navigation stay off the page; the course facts and the price slot print.
  await expect(page.locator(".masthead nav")).toBeHidden();
  await expect(page.locator(".hero-facts .run-facts")).toBeVisible();
  await expect(page.locator(".hero-facts .fact-price")).toBeVisible();
  await expect(page.locator(".hero-facts .fact-price")).not.toHaveText("");
});
