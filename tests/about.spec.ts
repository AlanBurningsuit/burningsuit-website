import { test, expect } from "@playwright/test";
import { pages, redirects } from "../src/config/compatibility.mjs";
import { ENQUIRY } from "../src/config/enquiry.mjs";

const route = "/about/";
const linkedin = "https://www.linkedin.com/in/alan-harman-box";

test("About stays static, private and CSP-clean, with no form or third-party request", async ({ page, baseURL }) => {
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
  // Load every lazy photo so their requests are counted too.
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((el: HTMLImageElement) => el.decode());
  }
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("About Alan Harman-Box | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "I'm Alan Harman-Box, and burningsuit is me. I write and teach Power BI and AI courses for people whose job isn't Power BI, and help teams with their own reporting.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('script, astro-island, iframe, link[rel="canonical"], [data-rebuild-placeholder], form')).toHaveCount(0);
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("About");
  expect(await page.locator("body").innerText()).not.toMatch(/[£$€]\s*\d/);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("About keeps the approved wording, headings and anchors", async ({ page }) => {
  await page.goto(route);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to page and test together.
  await expect(page.locator("h1")).toHaveText("Power BI and AI for everyone else.");
  await expect(page.locator("h1 .em")).toHaveText("else");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["I start from what people can do", "The part that isn't really technical", "Where burningsuit comes from", "And the dog", "Where to start"]);
  await expect(page.locator("h3")).toHaveCount(0);

  expect(pages.about).toEqual(["capable", "human", "origin", "dog"]);
  for (const [id, heading] of [["capable", "I start from what people can do"], ["human", "The part that isn't really technical"], ["origin", "Where burningsuit comes from"], ["dog", "And the dog"]]) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`[id="${id}"] h2`)).toHaveText(heading);
  }

  await expect(page.locator("main p")).toHaveText([
    "I'm Alan Harman-Box, and burningsuit is me. There's a lot of noise about AI and Power BI at the moment, and most of it feels aimed at people who already spend their days talking about agents. I'm interested in everyone else: the people who just want to get their job done well, and would rather not turn into a nerd to do it. Which is fine by me. I'm more than happy to be the nerd in the room, and to explain things so that you don't have to become one.",
    "I've got a fairly stubborn belief that, with the right instruction and a bit of encouragement, almost anyone can learn almost anything. So I won't turn up assuming you're behind, or that the people are the problem. If someone's finding Power BI hard, I'd sooner assume they're busy with the day job, a bit wary of the latest thing and short of someone to explain it, than assume they can't do it.",
    "I write and teach every burningsuit course myself. I also work alongside teams on their own reporting.",
    "I know the nuts and bolts of Power BI well, but that's honestly not usually the thing that makes the difference. It's much more about whether people who are busy, and a bit sceptical, actually feel like having a go. And whether, by the end, you reckon I get how you work, rather than feeling someone turned up to tell you you've been doing it wrong. That's really the part I care about getting right.",
    "I've spent about five years working with organisations as they adopt Power BI and Fabric, and before that about a decade in software delivery. I've also given a talk called \"We're all middle management now\" at the Bristol and Manchester Power BI user groups and at DataSwindon, about being responsible for work you've handed off to something that can't be held responsible for it. The thing that's stuck with me through all of it is that this work mostly succeeds or fails on the people side, well before the technology really comes into it.",
    "burningsuit was my parents' Power BI training business. My mum and dad, Alison and Stuart, handed it over to me and they're properly retired now, so it's me. It's still a training business at heart. I teach Power BI and how to work with AI agents on it, with consultancy alongside, and the reason it exists hasn't really changed.",
    "As my mum said, burningsuit was for \"everyone else\". Normal people, basically. Not the nerds, and not the people who are always online performing their work: just someone trying to get a job done. That's still who it's for.",
    "Last thing: this is Zelda, who I'm told is Chief Morale Officer. She's no use at all with the DAX, but she's very good at making me get up and go outside now and then, which honestly does more for the work than you'd think.",
    "You can email me or use the enquiry form. I'm on LinkedIn too.",
  ]);
  // No inherited offer, unbuilt destination or invented signoff creeps back in.
  const text = await page.locator("main").innerText();
  for (const absent of [/case stud/i, /free hour/i, /since \d{4}/i, /\[|\]/, /—/]) expect(text).not.toMatch(absent);
});

test("each photo sits with its prose, framed, at its own aspect ratio, with metadata captions", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("main img")).toHaveCount(4);
  // The introduction opens with Alan at a café table, beside its paragraph; it loads eagerly, being in the first view.
  const cafe = page.locator(".about-intro figure.framed-photo img");
  await expect(cafe).toHaveAttribute("alt", "Alan at an outdoor café table on a town street, writing on a tablet with a stylus beside a cup of coffee");
  await expect(cafe).toHaveAttribute("src", /DSC09129/);
  // It sits beside both the opening paragraph and the first chapter, which share its column.
  expect(await page.locator(".about-intro figure").evaluate((el) => el.previousElementSibling?.className)).toBe("about-intro-text");
  await expect(page.locator(".about-intro-text > .about-lead + #capable")).toHaveCount(1);
  const photos = [
    ["#human", "mmn-talk", "Alan giving his talk 'We're all middle management now' at a user group, the title slide beside him", "We're all middle management now", 1400 / 933],
    ["#origin", "stuart-alison", "Alison and Stuart, who ran burningsuit before Alan, at a laptop together", "Alison and Stuart", 1400 / 1120],
    ["#dog", "zelda", "Zelda, a small black-and-tan dog, snuggled into a cream fleece blanket", "Zelda", 1400 / 933],
  ] as const;
  for (const [section, file, alt, caption, ratio] of photos) {
    const figure = page.locator(`${section} figure.framed-photo`);
    await expect(figure).toHaveCount(1);
    // The figure is the section's own, after its prose (placed opposite it on wide screens).
    expect(await figure.evaluate((el) => el.previousElementSibling?.className)).toBe("about-prose");
    expect(await figure.evaluate((el) => el.nextElementSibling)).toBeNull();
    const img = figure.locator("img");
    await expect(img).toHaveAttribute("alt", alt);
    await expect(img).toHaveAttribute("src", new RegExp(file));
    await expect(img).toHaveAttribute("srcset", /\.webp/);
    await expect(img).toHaveAttribute("loading", "lazy");
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((el: HTMLImageElement) => el.decode());
    const shown = await img.evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { ratio: (r.width - 2 * parseFloat(s.borderLeftWidth)) / (r.height - 2 * parseFloat(s.borderTopWidth)), border: s.borderTopStyle }; });
    expect(shown.border).toBe("solid");
    expect(Math.abs(shown.ratio - ratio)).toBeLessThan(0.02);
    await expect(figure.locator("figcaption")).toHaveText(caption);
    expect(await figure.locator("figcaption").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Burningsuit Reader/);
  }
  // The parents' photo keeps its 5:4 frame rather than being cropped to the others' 3:2.
  const [talkRatio, parentsRatio] = await Promise.all(["#human img", "#origin img"].map((s) => page.locator(s).evaluate((el) => el.clientWidth / el.clientHeight)));
  expect(talkRatio).toBeGreaterThan(parentsRatio + 0.2);
});

test("About links: courses first, consultancy second, then email, the form and LinkedIn", async ({ page }) => {
  await page.goto(route);
  await expect(page.getByRole("link", { name: "every burningsuit course" })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("link", { name: "work alongside teams on their own reporting" })).toHaveAttribute("href", "/power-bi/");
  await expect(page.getByRole("link", { name: "email me" })).toHaveAttribute("href", `mailto:${ENQUIRY.email}`);
  await expect(page.getByRole("link", { name: "the enquiry form" })).toHaveAttribute("href", "/#contact");
  await expect(page.locator("main").getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", linkedin);
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual(["/training/", "/power-bi/", `mailto:${ENQUIRY.email}`, "/#contact", linkedin]);
  // Profile aliases keep landing here; contact aliases now lead to the Contact page.
  for (const alias of ["/team-member/alan-harman-box", "/about-us/our-trainers"]) expect(redirects[alias as keyof typeof redirects]).toBe("/about/");
});

test("About works without JavaScript, from the keyboard and from a legacy alias", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/team-member/alan-harman-box/");
  await expect(page).toHaveURL(baseURL! + route);
  await expect(page.locator("h1")).toBeVisible();
  // Old anchors still land on their chapter.
  for (const id of ["origin", "dog"]) {
    await page.goto("/");
    await page.goto(`${route}#${id}`);
    await expect(page.locator(`#${id} h2`)).toBeInViewport();
  }
  await page.goto("/");
  await page.goto(route);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
    const ring = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { width: parseFloat(s.outlineWidth), visible: r.width > 0 && r.height > 0 }; });
    expect(ring.width).toBeGreaterThanOrEqual(3);
    expect(ring.visible).toBe(true);
  }
  expect(reached).toEqual(["/training/", "/power-bi/", `mailto:${ENQUIRY.email}`, "/#contact", linkedin]);
  await context.close();
});

test("About layout: one reading column, each heading above its prose, photos opposite and alternating on wide screens", async ({ page }) => {
  const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  for (const id of ["capable", "human", "origin", "dog"]) {
    const [h, p] = [await box(`#${id} h2`), await box(`#${id} .about-prose`)];
    expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    expect(Math.abs(p.x - h.x)).toBeLessThanOrEqual(1);
    // A reading column, not the full content width.
    expect(p.width).toBeLessThanOrEqual(760);
  }
  // The text starts on the title band's left edge, except where a photo takes the left; photos alternate sides
  // (introduction right, human left, origin right, dog left), each beside its own prose.
  const edge = (await box(".title-band h1")).x;
  expect(Math.abs((await box(".about-lead")).x - edge)).toBeLessThanOrEqual(1);
  expect(Math.abs((await box("#capable h2")).x - edge)).toBeLessThanOrEqual(1);
  const cafe = await box(".about-intro figure"), chapter = await box("#capable .about-prose");
  expect(cafe.x).toBeGreaterThanOrEqual(chapter.x + chapter.width);
  for (const [section, side] of [[".about-intro", "right"], ["#human", "left"], ["#origin", "right"], ["#dog", "left"]] as const) {
    const photo = await box(`${section} > figure`), text = await box(section === ".about-intro" ? ".about-lead" : `${section} > .about-prose`);
    if (side === "right") expect(photo.x).toBeGreaterThanOrEqual(text.x + text.width);
    else { expect(text.x).toBeGreaterThanOrEqual(photo.x + photo.width); expect(Math.abs(photo.x - edge)).toBeLessThanOrEqual(1); }
    expect(photo.y).toBeLessThan(text.y + text.height);
  }
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ["capable", "human", "origin", "dog"]) {
      const [h, p] = [await box(`#${id} h2`), await box(`#${id} .about-prose`)];
      expect(p.y).toBeGreaterThanOrEqual(h.y + h.height);
    }
    for (const item of await page.locator("main figure, main a, main h1, main h2").all()) {
      const b = (await item.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`About reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "the enquiry form" })).toBeVisible();
    }
  });
}

for (const width of [1366, 390]) {
  test(`visual review at ${width}px: ${route}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    // Load the lazy photos before the full-page capture so review artifacts include them.
    for (const img of await page.locator("main img").all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((el: HTMLImageElement) => el.decode());
    }
    await page.evaluate(() => { window.scrollTo(0, 0); return document.fonts.ready; });
    const capture = info.outputPath("page.png");
    await page.screenshot({ path: capture, fullPage: true });
    await info.attach("page", { path: capture, contentType: "image/png" });
  });
}
