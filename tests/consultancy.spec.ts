import { test, expect, isTracker, otherScripts } from "./analytics";
import { reportCspViolations, visualReview, expectIndexable } from "./helpers";
import { pages } from "../src/config/compatibility.mjs";
import { ENQUIRY, formActionSource } from "../src/config/enquiry.mjs";
import { priced, expectAmountsOnlyWhenPriced } from "./prices";

const route = "/power-bi/";
const call = "/call/";

test("consultancy page stays static, private and CSP-clean", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL && !isTracker(request.url())) external.push(request.url());
  });
  await reportCspViolations(page);
  expect((await page.goto(route))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("Power BI consultancy | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", `Power BI consultancy done with your team, on your own data, models and reports, so the team can run it without me afterwards.${priced ? "" : " Price on request."}`);
  await expectIndexable(page);
  await expect(page.locator(`${otherScripts}, astro-island`)).toHaveCount(0);
  expect(await page.locator('meta[http-equiv="Content-Security-Policy" i]').getAttribute("content")).toContain(`form-action ${formActionSource}`);
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Consultancy");
  await expect(page.locator("section.course-run")).toHaveAttribute("aria-label", "Consultancy facts and booking");
  await expectAmountsOnlyWhenPriced(page, "consultancy");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("consultancy page follows the visitor questions with the kept anchors", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveText("Power BI consultancy that leaves your team independent");
  // One emphasised word in the title, in amber like the other pages' titles.
  await expect(page.locator("h1 .em")).toHaveText("independent");
  // The last heading is the shared form's slot text, so a change to the form's heading slot fails here too.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["The work I take on", "How I work with your team", "AI agents on your own Power BI", "How the work runs", "After the work", "Who does the work", "How to start", "Prefer to write?"]);

  // Exactly the kept anchors from the route manifest, each on its own section, and none of the dropped ones.
  expect(pages["power-bi"]).toEqual(["situations", "how-the-work-runs", "pricing", "ai", "ongoing", "start"]);
  for (const [id, heading] of [["situations", "The work I take on"], ["how-the-work-runs", "How the work runs"], ["ai", "AI agents on your own Power BI"], ["ongoing", "After the work"], ["start", "How to start"]]) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`[id="${id}"] h2`)).toHaveText(heading);
  }
  await expect(page.locator(".do-steps > li").nth(1)).toHaveAttribute("id", "pricing");
  for (const id of ["deliver", "skills", "handover", "backup", "second-opinion", "discovery"]) await expect(page.locator(`[id="${id}"]`)).toHaveCount(0);

  // The price line is checked in memory by training-prices.spec.ts, so no amount is ever printed here.
  const priceLine = ((await page.locator(".run-facts > li").nth(0).textContent()) ?? "").trim();
  expect(priced ? priceLine.startsWith("Usually a fixed price of ") : priceLine === "Price on request, usually a fixed price", "consultancy price line").toBe(true);
  await expect(page.locator(".run-facts > li").filter({ hasNotText: /price/i })).toHaveText(["You get me, working with your team", "Built so your team can run it without me afterwards", "It starts with a free 30-minute call"]);
  await expect(page.locator("#situations .lead-list > li strong")).toHaveText(["Thinking through your reporting as a whole.", "Owning the Power BI you've already got.", "Building or moving something, together.", "Getting started with AI agents."]);
  await expect(page.locator(".do-steps")).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - heading "The free call." [level=3]:
          - link "The free call"
        - paragraph
      - listitem:
        - heading "A price for the whole job." [level=3]
        - paragraph
      - listitem:
        - heading "The work, with your team." [level=3]
        - paragraph
      - listitem:
        - heading "Handover." [level=3]
        - paragraph
  `);
  await expect(page.locator(".do-steps h3 a")).not.toHaveClass(/text-link/);
  // Approved body wording, not just headings: the opening and the spine a budget holder may be forwarded.
  await expect(page.locator(".title-band .standfirst")).toHaveText("Got a Power BI problem training won't fix?");
  await expect(page.locator(".do-steps > li > p")).toHaveText([
    "We talk through what's going on. Sometimes that's enough: I can point you to what to do next, or tell you if it isn't something I can help with.",
    "Every job is different, so I quote case by case, usually as a fixed price. Getting to know your Power BI properly is part of the work, so there's nothing separate to pay for first.",
    "They do as much of it as they can, with me alongside.",
    "Your team finishes knowing what we did and why, how to change it and what will happen when they do. You keep our notes and the session recordings, so there's something to fall back on. If you'd rather not be recorded, just say.",
  ]);
  // Alan's line leads the support column in display type; the options follow their own introduction.
  await expect(page.locator("#ongoing .ongoing-body > *").nth(0)).toHaveClass(/pull-line/);
  const pull = await page.locator(".pull-line").evaluate((el) => { const s = getComputedStyle(el); return { weight: s.fontWeight, rule: s.borderLeftStyle, size: parseFloat(s.fontSize), body: parseFloat(getComputedStyle(document.body).fontSize) }; });
  // Section weight (700): display 800 is reserved for the page title.
  expect(pull.weight).toBe("700");
  expect(pull.rule).toBe("solid");
  expect(pull.size).toBeGreaterThan(pull.body * 1.3);
  await expect(page.locator("#ongoing .ongoing-body > *").nth(1)).toHaveClass(/ongoing-intro/);
  // Approved wording is pinned on purpose: changing it needs Alan's approval, then a deliberate edit to page and test together.
  await expect(page.locator(".course-intro > p:not(.standfirst)")).toHaveText([
    "Training is great when all your team needs is understanding. Sometimes a team needs more than that: the reporting is already running, people rely on it, and it has become hard to change safely.",
    "That's what my consultancy is for. I work with your team on your own Power BI: how the data gets in, the models, the reports and how they reach the people who use them. I explain as I go, in your words rather than mine. The aim is a team that understands what was built and can change it, not one that relies on yet another contractor.",
    "Not sure whether your problem is too small, or too big, for me to take on? Bring that to a free 30-minute call.",
  ]);
  await expect(page.locator("#situations .split-lead p")).toHaveText("Ideally, the work is done with you, not for you.");
  await expect(page.locator(".courses-line")).toHaveText("Just need your team to understand Power BI? That's what the courses are for. Want 1 to 3 people to learn on your own work? That's what Power BI coaching is for.");
  await expect(page.locator(".start-ask")).toHaveText("Tell me what's happening with your Power BI, and we'll work out what would help.");
  await expect(page.locator("#situations .lead-list > li")).toHaveText(["Thinking through your reporting as a whole. We look at what it's for, what it takes to run it and which skills your team needs. Then we agree what to do first.", "Owning the Power BI you've already got. It all rests on one person, or your experienced Power BI person has already left, or the reports have limped on for years and nobody is quite sure how they work. Or two reports disagree, and you can't tell which to trust. I go through the reports and models with you, find where the risks are and help your team take charge of the reporting.", "Building or moving something, together. That might be a new model or report your team can't build yet, or moving your reporting into Power BI. Either way, your team knows how it works before they rely on it. If you're moving to Microsoft Fabric (the wider data platform that Power BI is part of), I coach your team through its own migration. I don't do the Fabric migration work myself.", "Getting started with AI agents. I coach your team to use them on the Power BI you've got. More on that below."]);
  await expect(page.locator(".build-line")).toHaveText("If you'd rather I simply built it for you, I can. Even then, I'll leave your team able to change it without calling me.");
  await expect(page.locator('[aria-labelledby="method-title"] .lead-list > li')).toHaveText(["Coaching your team to do it. I take your team through each part of the work and, wherever I can, have them do it themselves while I help and check.", "In your own setup. We work with your data, models and reports, and the deadlines you actually have."]);
  await expect(page.locator("#ai .raised-copy p")).toHaveText("If your team wants to start using AI agents, we start from what you already have: your licences, tools, skills and setup. We work out what to hand to an agent, what to keep it away from, and how your team checks what it changed. Your team learns to use agents themselves, so you get work you can check, not new risks or a mess to clear up later.");
  await expect(page.locator("#ongoing p")).toHaveText(["The whole point is that you don't need me.", "I'll teach your team the tool; I won't teach them to wait for me.", "Some teams still want someone to call on. If you do, we shape the support to fit the work we've done, for example:", priced ? "It's priced on request." : "It's priced on request, like the rest of the work."]);
  await expect(page.locator("#ongoing .lead-list > li")).toHaveText(["Retained support for your team.", "Strategic advice as your reporting changes.", "Regular office hours, such as a monthly call in a fixed window, where your team brings whatever has come up."]);
  await expect(page.locator(".who-note p")).toHaveText("I'm Alan Harman-Box. The person you talk to on the free call is the person who does the work. I've spent about five years working with organisations as they adopt Power BI and Fabric, and about a decade in software delivery before that. I also write and teach the burningsuit courses, so explaining Power BI as we go is what I do anyway. Since 2022 I've done Power BI consultancy for 15 organisations, from a single scoping session to work that has run for more than three years.");

  // The AI band and the free call are raised off the daylight body; the sequence and lists sit on it.
  const background = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
  const ground = await background("main");
  expect(await background("#ai")).not.toBe(ground);
  expect(await background("#start")).toBe(await background("#ai"));
  for (const selector of ["#how-the-work-runs", "#situations", "#ongoing"]) expect(await background(selector)).toBe("rgba(0, 0, 0, 0)");
  // #start leads with the free call, before the shared form's dark band.
  expect(await background("#contact")).not.toBe(ground);
  expect(await page.locator("#start + #contact").count()).toBe(1);

  const text = await page.locator("main").innerText();
  for (const absent of [/\[|\]/, /second opinion/i, /discovery/i]) expect(text).not.toMatch(absent);
  await expect(page.locator(".to-confirm")).toHaveCount(0);
  // One approved, anonymised pull quote, beside the work it backs.
  await expect(page.locator("#situations figure.pull-quote blockquote")).toHaveText("\"This has moved us on leaps and bounds… information just at our fingertips.\"");
  await expect(page.locator("main blockquote")).toHaveCount(1);
  // One candid photo, in Who does the work, in the brand's carved frame.
  await expect(page.locator("main img")).toHaveCount(1);
  const photo = page.locator(".who-does figure.framed-photo img");
  await expect(photo).toHaveAttribute("alt", "Alan Harman-Box writing on a tablet at an outdoor café table");
  await expect(photo).toHaveAttribute("src", /DSC09119/);
  expect(await photo.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
});

test("consultancy links go to the free call page, the AI band, the courses and About", async ({ page }) => {
  await page.goto(route);
  const free = page.getByRole("link", { name: "Book a free 30-minute call" });
  await expect(free).toHaveCount(3);
  for (const link of await free.all()) await expect(link).toHaveAttribute("href", call);
  await expect(page.getByRole("link", { name: "The free call" })).toHaveAttribute("href", call);
  await expect(page.getByRole("link", { name: "More on that below", exact: true })).toHaveAttribute("href", "#ai");
  await expect(page.getByRole("link", { name: "That's what the courses are for." })).toHaveAttribute("href", "/training/");
  await expect(page.getByRole("link", { name: "That's what Power BI coaching is for." })).toHaveAttribute("href", "/training/#coaching");
  await expect(page.getByRole("link", { name: "More about me" })).toHaveAttribute("href", "/about/");
  const mainLinks = await page.locator("main a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(mainLinks).toEqual([call, "#ai", "/training/", "/training/#coaching", "/work/carbon-footprint/", "/work/", call, "/writing/we-are-all-middle-management-now/", call, "/about/", call, ENQUIRY.privacyPath, `mailto:${ENQUIRY.email}`]);
});

test("consultancy enquiry form is labelled, plain and has nothing preselected", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("form")).toHaveCount(1);
  const form = page.getByRole("form", { name: "Prefer to write?" });
  await expect(form).toHaveAttribute("method", "post");
  await expect(page.locator(".enquiry-intro p")).toHaveText("A few lines on where you are and what you need is plenty.");
  await expect(form.getByRole("textbox")).toHaveCount(3);
  await expect(form.getByRole("radio")).toHaveCount(0);
  await expect(page.locator('#contact .fallback a[href="mailto:alan@burningsuit.co.uk"]')).toBeVisible();
});

test("consultancy page works without JavaScript, from keyboard and from a legacy address", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/ai-fit-for-teams/");
  await expect(page).toHaveURL(baseURL! + route + "#ai");
  await expect(page.locator("#ai h2")).toBeInViewport();
  // A dropped fragment lands at the top of the page.
  await page.goto("/");
  await page.goto(route + "#discovery");
  await expect(page.locator("h1")).toBeInViewport();
  await page.goto("/");
  await page.goto(route + "#pricing");
  await expect(page.locator("#pricing h3")).toBeInViewport();
  await page.goto("/");
  await page.goto(route);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const reached: string[] = [];
  for (let i = 0; i < 11; i++) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
  }
  expect(reached).toEqual([call, "#ai", "/training/", "/training/#coaching", "/work/carbon-footprint/", "/work/", call, "/writing/we-are-all-middle-management-now/", call, "/about/", call]);
  // The step heading link shows a visible focus ring.
  await page.locator(".do-steps h3 a").focus();
  expect(await page.locator(".do-steps h3 a").evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  await page.getByRole("link", { name: "More on that below", exact: true }).click();
  await expect(page).toHaveURL(baseURL! + route + "#ai");
  // The coaching pointer lands on the Training page's coaching section.
  await page.getByRole("link", { name: "That's what Power BI coaching is for." }).click();
  await expect(page).toHaveURL(baseURL! + "/training/#coaching");
  await expect(page.locator("#coaching-title")).toBeInViewport();
  await context.close();
});

test("consultancy layout: facts beside the introduction on wide screens, after it on narrow ones", async ({ page }) => {
  const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(route);
  let intro = await box(".course-intro"), facts = await box(".course-run");
  expect(facts.x).toBeGreaterThanOrEqual(intro.x + intro.width);
  expect(facts.y).toBeLessThan(intro.y + intro.height);
  for (const [lead, body] of [["#situations .split-lead", "#situations .split-body"], ["#ongoing .ongoing-lead", "#ongoing .ongoing-body"], [".who-does h2", ".who-note"]]) {
    const [l, b] = [await box(lead), await box(body)];
    expect(b.x).toBeGreaterThanOrEqual(l.x + l.width);
  }
  // How to start breaks the run of side-by-side sections: its heading and ask sit above the link.
  expect((await box(".start-link")).y).toBeGreaterThanOrEqual((await box("#start .book-inner > div:first-child")).y + (await box("#start .book-inner > div:first-child")).height);
  // Who does the work reads at body width, not the 101's narrow aside.
  expect((await box(".who-note")).width).toBeGreaterThan(600);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    intro = await box(".course-intro"); facts = await box(".course-run");
    expect(facts.y).toBeGreaterThanOrEqual(intro.y + intro.height);
    expect((await box("#situations")).y).toBeGreaterThanOrEqual(facts.y + facts.height);
    for (const selector of [".do-steps", ".lead-list", ".start-link", ".run-action", ".do-steps h3 a"]) {
      for (const item of await page.locator(selector).all()) {
        const b = (await item.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(width);
      }
    }
    // The display line wraps evenly on phones (no forced clause break): three lines at most.
    const lines = await page.locator(".pull-line").evaluate((el) => {
      const range = document.createRange(); range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(lines).toBeLessThanOrEqual(3);
    // The step heading link's focus ring, offset outside the link, stays on screen beside the spine.
    const ring = await page.locator(".do-steps h3 a").evaluate((el) => {
      (el as HTMLElement).focus();
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const out = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
      return { left: r.left - out, right: r.right + out };
    });
    expect(ring.left).toBeGreaterThanOrEqual(0);
    expect(ring.right).toBeLessThanOrEqual(width);
  }
});

for (const width of [320, 390, 768, 1366]) {
  test(`consultancy page reflows at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto(route);
    for (const size of ["100%", "200%"]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

visualReview(route);

test("consultancy enquiry posts plainly from this page without JavaScript", async ({ browser, baseURL }) => {
  // The provider is stubbed: no sample enquiry is ever sent.
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  let payload: URLSearchParams | undefined;
  await context.route(ENQUIRY.action!, async (request) => {
    payload = new URLSearchParams(request.request().postData()!);
    await request.fulfill({ status: 302, headers: { location: new URL(payload.get("_redirect")!, baseURL).href } });
  });
  await page.goto(route + "#contact");
  const form = page.getByRole("form", { name: "Prefer to write?" });
  await form.getByLabel("Name (optional)", { exact: true }).fill("Test Person");
  await form.getByLabel("Email", { exact: true }).fill("test@example.com");
  await form.getByLabel("Your message", { exact: true }).fill("A sample consultancy enquiry.");
  await form.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page).toHaveURL(new URL(ENQUIRY.successPath, baseURL).href);
  expect(payload!.get("message")).toBe("A sample consultancy enquiry.");
  expect(payload!.get("_append")).toBe("false");
  await context.close();
});
