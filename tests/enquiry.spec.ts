import { test, expect, otherScripts } from "./analytics";
import { ENQUIRY } from "../src/config/enquiry.mjs";

// The normal suite stubs the provider: it never emails sample enquiries.
for (const outcome of ["success", "error"] as const) {
  test(`plain POST reaches the ${outcome} page without JavaScript or personal data in its URL`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/violates.*content security policy/i.test(message.text())) violations.push(message.text());
    });
    let payload: URLSearchParams | undefined;
    await context.route(ENQUIRY.action!, async (route) => {
      expect(route.request().method()).toBe("POST");
      payload = new URLSearchParams(route.request().postData()!);
      const destination = payload.get(outcome === "success" ? "_redirect" : "_error")!;
      await route.fulfill({ status: 302, headers: { location: new URL(destination, baseURL).href } });
    });
    await page.goto("/#contact");
    const form = page.getByRole("form");
    await form.getByLabel("Name (optional)", { exact: true }).fill("Test Person");
    await form.getByLabel("Email", { exact: true }).fill("test@example.com");
    await form.getByLabel("Your message", { exact: true }).fill("A sample enquiry with spaces & punctuation.");
    await form.getByRole("button", { name: "Send", exact: true }).click();
    const path = outcome === "success" ? ENQUIRY.successPath : ENQUIRY.errorPath;
    await expect(page).toHaveURL(new URL(path, baseURL).href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(outcome === "success" ? "Your message has been sent" : "Your message could not be sent");
    expect([...payload!.keys()].filter((key) => !key.startsWith("_")).sort()).toEqual(["email", "message", "name", "page"]);
    expect(payload!.get("name")).toBe("Test Person");
    expect(payload!.get("email")).toBe("test@example.com");
    expect(payload!.get("message")).toBe("A sample enquiry with spaces & punctuation.");
    expect(payload!.get("_append")).toBe("false");
    expect(payload!.get("page")).toBe("/");
    expect(payload!.get("_redirect")).not.toBe(payload!.get("_error"));
    expect(payload!.has("_gotcha")).toBe(false);
    expect(violations).toEqual([]);
    if (outcome === "error") {
      await expect(page.getByRole("link", { name: ENQUIRY.email }).first()).toHaveAttribute("href", `mailto:${ENQUIRY.email}`);
      await page.getByRole("link", { name: "Back to the enquiry form" }).click();
      await expect(page).toHaveURL(new URL("/contact/", baseURL).href);
    }
    await context.close();
  });
}

test("incomplete enquiries cannot leave the page without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  let requests = 0;
  await context.route(ENQUIRY.action!, async (route) => { requests++; await route.abort(); });
  const page = await context.newPage();
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  // The name is optional, so the first field the browser holds is the email.
  await expect(page.locator("#enquiry-email")).toBeFocused();
  expect(requests).toBe(0);
  await expect(page).toHaveURL(new URL("/#contact", baseURL).href);
  await expect(page.locator("#enquiry-privacy a")).toHaveAttribute("href", ENQUIRY.privacyPath);
  await context.close();
});

for (const path of [ENQUIRY.successPath, ENQUIRY.errorPath, ENQUIRY.privacyPath]) {
  test(`enquiry supporting page is accessible, kept out of search only if it is a result, and reflows: ${path}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(path);
    // The two results stay out of search; the enquiry privacy notice is an ordinary indexed page.
    if (path === ENQUIRY.privacyPath) await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    else await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator(otherScripts)).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    for (const width of [320, 390, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await context.close();
  });
}
