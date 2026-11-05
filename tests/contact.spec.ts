import { test, expect } from "@playwright/test";
import { bespokeRoutes, pages, redirects } from "../src/config/compatibility.mjs";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";

const route = "/contact/";
const mailto = `mailto:${ENQUIRY.email}`;
const intro = [
  "I'm Alan Harman-Box. Send me a question about a course or your reports, or tell me what you're working on if you're unsure where to start. I'll reply by email.",
  `Email me at ${ENQUIRY.email}, or use the form.`,
];

test("Contact is a real static page: private, CSP-clean, with Contact current", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL) external.push(request.url());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP: ${event.violatedDirective}`));
  });
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveURL(baseURL! + route);
  await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
  await expect(page).toHaveTitle("Contact Alan | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Ask Alan Harman-Box about a course, help with your own reports, or where to start. A short message is enough.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('script, astro-island, link[rel="canonical"], [data-rebuild-placeholder], main img')).toHaveCount(0);
  expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain(`form-action ${formActionSource}`);
  await expect(page.locator("nav a[aria-current]")).toHaveCount(1);
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Contact");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact Alan");
  await expect(page.locator("main h2")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("Contact replaces its redirect; the contact aliases lead here", async ({ browser, baseURL }) => {
  expect(bespokeRoutes).toContain("contact");
  expect(pages.contact).toEqual([]);
  expect(redirects).not.toHaveProperty("/contact");
  expect(redirects["/get-in-touch"]).toBe(route);
  expect(redirects["/get-touch"]).toBe(route);
  for (const [from, to] of Object.entries(redirects)) expect(new URL(to, baseURL).pathname.replace(/\/$/, "")).not.toBe(from.replace(/\/$/, ""));
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  for (const alias of ["/get-in-touch/", "/get-touch/", "/get-in-touch", "/get-touch"]) {
    await page.goto(alias);
    await expect(page).toHaveURL(baseURL! + route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact Alan");
  }
  // The old slashless address serves the page itself, not a refresh redirect.
  await page.goto("/contact");
  expect(new URL(page.url()).pathname).toMatch(/^\/contact\/?$/);
  await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact Alan");
  await context.close();
});

test("Contact shows the approved wording, with email above the form and no second fallback", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator(".enquiry-intro p")).toHaveText(intro);
  await expect(page.locator(".enquiry-intro p p")).toHaveCount(0);
  await expect(page.locator(".enquiry-intro").getByRole("link", { name: ENQUIRY.email })).toHaveAttribute("href", mailto);
  await expect(page.locator("#contact .fallback")).toHaveCount(0);
  const form = page.getByRole("form", { name: "Contact Alan" });
  await expect(form).toHaveAttribute("method", "post");
  if (ENQUIRY.action) await expect(form).toHaveAttribute("action", ENQUIRY.action);
  else await expect(form).not.toHaveAttribute("action", /./);
  await expect(form.locator("label")).toHaveText(["Name (optional)", "Email", "Your message"]);
  await expect(form.getByLabel("Your message")).toHaveAccessibleDescription("A line or two is enough: a course name, or what's going on with your reports.");
  await expect(form.locator("#enquiry-privacy")).toHaveText("I use your details to reply to your enquiry. Formspark delivers this form. Read how I handle your information.");
  await expect(form.getByRole("link", { name: "Read how I handle your information" })).toHaveAttribute("href", ENQUIRY.privacyPath);
  const send = form.getByRole("button");
  await expect(send).toHaveText("Send");
  await expect(send).toHaveAttribute("type", "submit");
  if (ENQUIRY.action) await expect(send).toBeEnabled();
  else await expect(send).toBeDisabled();
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual([mailto, ENQUIRY.privacyPath]);
  // Email comes before the form in source order and on narrow screens.
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const emailLine = (await page.locator(".enquiry-intro p").nth(1).boundingBox())!;
    const formBox = (await form.boundingBox())!;
    if (width === 390) expect(emailLine.y + emailLine.height).toBeLessThanOrEqual(formBox.y);
    else expect(emailLine.x + emailLine.width).toBeLessThanOrEqual(formBox.x);
  }
});

test("Contact asks only for an optional name, an email and a message", async ({ page }) => {
  await page.goto(route);
  const form = page.getByRole("form", { name: "Contact Alan" });
  const fields = await form.locator("input:not([type=hidden]):not([hidden]), textarea, select").evaluateAll((els) =>
    els.map((el) => [el.getAttribute("name"), el.getAttribute("type") ?? el.tagName.toLowerCase(), el.hasAttribute("required"), el.getAttribute("autocomplete")]));
  expect(fields).toEqual([["name", "text", false, "name"], ["email", "email", true, "email"], ["message", "textarea", true, null]]);
  await expect(form.locator("fieldset, [type=radio], [type=file], [type=tel], [minlength]")).toHaveCount(0);
  await expect(form.locator('input[name="_append"]')).toHaveValue("false");
  await expect(form.locator('input[name="_redirect"]')).toHaveValue(ENQUIRY.successPath);
  await expect(form.locator('input[name="_error"]')).toHaveValue(ENQUIRY.errorPath);
  await expect(form.locator('input[name="_gotcha"]')).toBeHidden();
  await expect(form.locator('input[name="_gotcha"]')).toHaveAttribute("tabindex", "-1");
  // Nothing is prefilled.
  await expect(form.locator("input:not([type=hidden]):not([type=checkbox])[value], textarea:not(:empty)")).toHaveCount(0);
});

test("Contact validates natively and works from the keyboard without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  let requests = 0;
  await context.route(ENQUIRY.action!, async (request) => { requests++; await request.abort(); });
  const page = await context.newPage();
  await page.goto(route);
  const form = page.getByRole("form", { name: "Contact Alan" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute("href") ?? (el.id || el.tagName.toLowerCase()), ring: parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== "none", visible: r.width > 0 && r.height > 0 };
    });
    reached.push(focus.id);
    expect(focus.ring).toBe(true);
    expect(focus.visible).toBe(true);
  }
  expect(reached).toEqual([mailto, "enquiry-name", "enquiry-email", "enquiry-message", ENQUIRY.privacyPath, "button"]);

  // Empty: the browser holds the enquiry and focuses the required email.
  await form.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#enquiry-email")).toBeFocused();
  await expect(form.locator(":invalid:not(form)")).toHaveCount(2);
  await form.getByLabel("Email", { exact: true }).fill("not-an-email");
  await form.getByLabel("Your message", { exact: true }).fill("Hello");
  await form.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#enquiry-email")).toBeFocused();
  await expect(form.locator(":invalid:not(form)")).toHaveCount(1);
  await form.getByLabel("Email", { exact: true }).fill("test@example.com");
  await form.getByLabel("Your message", { exact: true }).fill("");
  await form.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#enquiry-message")).toBeFocused();
  expect(requests).toBe(0);
  expect(new URL(page.url()).pathname).toBe(route);
  expect(new URL(page.url()).search).toBe("");
  await context.close();
});

for (const outcome of ["success", "error"] as const) {
  test(`Contact posts plainly with a blank name to the ${outcome} page, keeping personal data out of the URL`, async ({ browser, baseURL }) => {
    // The provider is stubbed: no sample enquiry is ever sent.
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    const violations: string[] = [];
    page.on("console", (message) => { if (/content security policy/i.test(message.text())) violations.push(message.text()); });
    let payload: URLSearchParams | undefined;
    let requests = 0;
    await context.route(ENQUIRY.action!, async (request) => {
      requests++;
      expect(request.request().method()).toBe("POST");
      payload = new URLSearchParams(request.request().postData()!);
      await request.fulfill({ status: 302, headers: { location: new URL(payload.get(outcome === "success" ? "_redirect" : "_error")!, baseURL).href } });
    });
    await page.goto(route);
    const form = page.getByRole("form", { name: "Contact Alan" });
    await form.getByLabel("Email", { exact: true }).fill("test@example.com");
    await form.getByLabel("Your message", { exact: true }).fill("Which course should our team start with?");
    await form.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page).toHaveURL(new URL(outcome === "success" ? ENQUIRY.successPath : ENQUIRY.errorPath, baseURL).href);
    expect(new URL(page.url()).search).toBe("");
    expect(page.url()).not.toContain("example.com");
    expect(requests).toBe(1);
    expect([...payload!.keys()].filter((key) => !key.startsWith("_")).sort()).toEqual(["email", "message", "name"]);
    expect(payload!.get("name")).toBe("");
    expect(payload!.get("email")).toBe("test@example.com");
    expect(payload!.get("message")).toBe("Which course should our team start with?");
    expect(payload!.get("_append")).toBe("false");
    expect(payload!.has("_gotcha")).toBe(false);
    expect(violations).toEqual([]);
    if (outcome === "error") {
      await page.getByRole("link", { name: "Back to the enquiry form" }).click();
      await expect(page).toHaveURL(baseURL! + route);
    }
    await context.close();
  });
}

test("the enquiry notice describes the three fields and returns to Contact", async ({ page, baseURL }) => {
  await page.goto(ENQUIRY.privacyPath);
  await expect(page.getByRole("heading", { name: "What I use it for" }).locator("+ p")).toHaveText("The form asks for your email and your message. Your name is optional. I use these details to answer your enquiry and discuss any work you ask about. Without an email address, I can't reply.");
  await expect(page.locator("main")).not.toContainText(/organisation|what your enquiry is about/i);
  await page.getByRole("link", { name: "Back to the enquiry form" }).click();
  await expect(page).toHaveURL(baseURL! + route);
});

test("Contact reflows without overflow down to 320px with enlarged text", async ({ page }) => {
  await page.goto(route);
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const spills = await page.locator("main *").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0).map((el) => el.className || el.tagName));
    expect(spills).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  }
});

for (const width of [1366, 390]) {
  test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const capture = info.outputPath("page.png");
    await page.screenshot({ path: capture, fullPage: true });
    await info.attach("page", { path: capture, contentType: "image/png" });
  });
}
