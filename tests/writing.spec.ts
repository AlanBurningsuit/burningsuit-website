import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, expectNoHorizontalScroll } from "./helpers";
import { NEWSLETTER } from "../src/config/newsletter.mjs";
import { redirects } from "../src/config/compatibility.mjs";

// The Writing index and Alison Box's restored posts (approved copy: the ops repo's site/writing-restored-posts-copy.md).
const essay = "/writing/we-are-all-middle-management-now/";
const threeNumbers = "/writing/three-numbers/";
const mcp = "/writing/the-power-bi-mcp-server-explained/";
const pqIf = "/writing/power-query-if-statement/";
const roche = "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/";
const secrets = "/blog/2019/04/7-secrets-of-the-matrix-visual/";
const eighth = "/blog/2020/10/the-8th-secret-of-the-matrix-visual-controlling-calculations-and-labels-on-subtotals/";
const bins = "/blog/2020/01/categorising-measures-into-numeric-ranges-or-bins/";
const topN = "/blog/2019/05/find-top-or-bottom-n-percent-dax/";
// Five more restored posts, 20 Nov 2026 (source and removals: the ops repo's site/writing-restored-posts-2-copy.md).
const nulls = "/blog/2020/11/how-dax-treats-nulls-zeros/";
const narrative = "/blog/using-dynamic-values-smart-narrative-and-text-box/";
const xAxis = "/blog/using-continuous-x-axis-column-charts-year-and-month-labels/";
const restApis = "/blog/2021/09/i-have-the-powerquery-using-power-query-to-call-rest-apis/";
const filtering = "/blog/filtering-using-dax-measures/";
// Per post: a hash of her prose as built, and the approved copy's headings, alt text and update notes (taken from the
// copy file, not from the build), each compared exactly.
type Note = { paragraphs: string[]; code?: string; table?: string[][] };
const prose = JSON.parse(readFileSync(new URL("./fixtures/archive-prose.json", import.meta.url), "utf8")) as Record<string, { paragraphCount: number; sha256: string; headings: string[]; alts: string[]; notes: Note[] }>;
const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const redirectMap = redirects as Record<string, string>;

test("Writing is an indexed list generated from the collection: articles, then the archive, newest first", async ({ page }) => {
  expect((await page.goto("/writing/"))?.status()).toBe(200);
  await expectIndexable(page);
  await expect(page).toHaveTitle("Writing | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Articles on Power BI, DAX and AI from burningsuit, and an archive of older posts by Alison Box and Stuart Box.");
  await expect(page.locator("h1")).toHaveText("Writing");
  await expect(page.locator(".title-band .standfirst")).toHaveText("Articles on Power BI, DAX and AI, newest first. burningsuit's older posts are in the archive below.");
  const lists = page.locator(".writing-entries");
  await expect(lists).toHaveCount(2);
  expect(await lists.nth(0).locator("a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([pqIf, mcp, threeNumbers, essay]);
  await expect(lists.nth(0).locator("li")).toHaveText(["How to write a Power Query if statement in Power BI Alan Harman-Box · November 2026 Use the Conditional column button or write if then else in M. How the Power Query if statement works in Power BI, with the common mistake that trips people up.", "The Power BI MCP server, explained for people who don't code Alan Harman-Box · November 2026 What Power BI's MCP servers do, why the agent already knows plenty without one, and when to bother setting one up.", "Data democracy or data demagoguery? Alan Harman-Box · November 2026 Power BI and Claude now build a dashboard on request. Why the work that made dashboards worth having still has to happen, and how to do it on purpose.", "We're all middle management now Alan Harman-Box · Talk, February 2026 Agentic development in Power BI: what an agent is, how far to trust its work, and what handing work to it costs."], { useInnerText: true });
  await expect(page.getByRole("heading", { level: 2, name: "From the archive" })).toBeVisible();
  expect(await lists.nth(1).locator("a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([narrative, filtering, xAxis, restApis, roche, nulls, eighth, bins, topN, secrets]);
  await expect(lists.nth(1).locator("h3")).toHaveText([
    "Using dynamic values in the smart narrative and text box",
    "Filtering using DAX measures",
    "Using a continuous x-axis on column charts for year and month labels",
    "I have the Power(query): using Power Query to call REST APIs",
    "Where do I make data transformations in Power BI? Roche's Maxim",
    "How DAX treats nulls and zeros",
    "The 8th secret of the matrix visual: controlling calculations and labels on subtotals",
    'Categorising measures into numeric ranges or "bins"',
    "Best and worst: two approaches to finding top or bottom N percent using DAX",
    "7 secrets of the matrix visual",
  ]);
  await expect(lists.nth(1).locator(".writing-entry-meta")).toHaveText(["Alison Box · October 2022", "Alison Box · August 2022", "Alison Box · April 2022", "Alan Harman-Box · September 2021", "Stuart Box · March 2021", "Alison Box · November 2020", "Alison Box · October 2020", "Alison Box · January 2020", "Alison Box · May 2019", "Alison Box · April 2019, revised July 2022"]);
  await expect(lists.nth(1).locator("p:not(.writing-entry-meta)")).toHaveText([
    "Replace a row of card visuals with one Power BI text box or smart narrative, using dynamic values from measures or natural language.",
    "You can't put a DAX measure in a slicer, but you can filter on one in the Filters pane, and with SUMX and FILTER where a matrix's columns need it.",
    "Give a Power BI column chart a continuous x-axis labelled by month and year: a STARTOFMONTH calculated column in your date table does it.",
    "Call a REST API from Power Query with Web.Contents and Json.Document: translate a column of text, then make the target language a parameter.",
    "Roche's Maxim: transform data as far upstream as possible, as far downstream as necessary. Stuart Box's 2021 post, which Matthew Roche credited as the first.",
    "DAX treats BLANK() and 0 as the same value in comparisons. How to tell blanks from zeros with ISBLANK in IF expressions and DAX measures.",
    "Use ISINSCOPE to give Power BI matrix subtotals their own calculation, such as % of parent row total, and give each subtotal level its own label.",
    "Count how many customers' total sales fall into each numeric range, or bin, with an unrelated table of ranges and one DAX measure in Power BI.",
    "Find your top or bottom 10 percent of customers by sales in DAX: rank them with RANKX, then use a fixed percentage or slicers that choose it.",
    "Seven matrix visual secrets in Power BI: grand totals, expanding a level, layout, per-level subtotals, values on rows, text values, conditional formatting.",
  ]);
  // A plain list: no images, no scripts beyond the shared tag, no form.
  await expect(page.locator("main img, main form")).toHaveCount(0);
  await expect(page.locator(otherScripts)).toHaveCount(0);
  const sitemap = await (await page.request.get("/sitemap-0.xml")).text();
  for (const route of ["/writing/", pqIf, mcp, threeNumbers, secrets, eighth, bins, topN, nulls, narrative, xAxis, restApis, filtering]) expect(sitemap).toContain(`<loc>https://burningsuit.co.uk${route}</loc>`);
});

test("/blog leads to Writing, and the restored posts' old addresses lead to them", async ({ page }) => {
  expect(redirectMap["/writing"]).toBeUndefined();
  const expected: Record<string, string> = {
    "/blog": "/writing/",
    "/blog/7-secrets-matrix-visual": secrets,
    "/7-secrets-of-the-matrix-visual": secrets,
    "/blog/8th-secret-matrix-visual-controlling-calculations-and-labels-subtotals": eighth,
    "/blog/categorising-measures-numeric-ranges-or-bins": bins,
    "/blog/2018/06/dax-how-to-group-measures-into-numeric-ranges": bins,
    "/blog/best-and-worst-two-approaches-finding-top-or-bottom-n-percent-using-dax": topN,
    "/find-top-or-bottom-n-percent-dax": topN,
    "/blog/how-dax-treats-nulls-zeros": nulls,
    "/how-dax-treats-nulls-zeros": nulls,
    "/blog/i-have-powerquery-using-power-query-call-rest-apis": restApis,
    "/i-have-the-powerquery-using-power-query-to-call-rest-apis": restApis,
  };
  for (const [from, to] of Object.entries(expected)) {
    expect(redirectMap[from], from).toBe(to);
    await page.goto(from + "/");
    await expect(page, from).toHaveURL(new RegExp(`${to.replaceAll("/", "\\/")}$`));
  }
  // The restored pages are pages again, not redirect stubs; other old posts still lead to Consultancy.
  for (const route of [secrets, eighth, bins, topN, nulls, narrative, xAxis, restApis, filtering]) expect(redirectMap[route.replace(/\/$/, "")]).toBeUndefined();
  expect(redirectMap["/blog/7-secrets-line-chart"]).toBe("/power-bi/");
  expect(redirectMap["/blog/2020/07/7-secrets-of-the-pie-chart"]).toBe("/power-bi/");
});

const posts: { route: string; title: string; heading: string; author?: string; byline: string; notice?: string; notes: number; screenshots: number; closing: string[] }[] = [
  { route: secrets, title: "7 secrets of the matrix visual in Power BI | burningsuit", heading: "7 secrets of the matrix visual", byline: "Alison Box · 9 April 2019 · Revised by Alison Box, July 2022", notice: "This post has dated update notes where Power BI has changed since it was written.", notes: 2, screenshots: 19, closing: ["/training/dax-fundamentals/", "/training/"] },
  { route: eighth, title: "The 8th secret of the matrix visual: subtotals | burningsuit", heading: "The 8th secret of the matrix visual: controlling calculations and labels on subtotals", byline: "Alison Box · 26 October 2020", notice: "This post has a dated update note where Power BI has changed since it was written.", notes: 1, screenshots: 6, closing: ["/training/dax-deep-dive/", "/training/"] },
  { route: bins, title: "Group a DAX measure into numeric ranges (bins) | burningsuit", heading: 'Categorising measures into numeric ranges or "bins"', byline: "Alison Box · 22 January 2020", notice: "This post has dated update notes where Power BI has changed, and where its screenshots have been lost.", notes: 4, screenshots: 0, closing: ["/training/dax-fundamentals/", "/training/"] },
  { route: topN, title: "Top or bottom N percent in DAX | burningsuit", heading: "Best and worst: two approaches to finding top or bottom N percent using DAX", byline: "Alison Box · 19 May 2019", notice: "This post has dated update notes, including a correction to the measure in Approach No. 2.", notes: 4, screenshots: 8, closing: ["/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/"] },
  { route: nulls, title: "How DAX treats nulls and zeros | burningsuit", heading: "How DAX treats nulls and zeros", byline: "Alison Box · 12 November 2020", notes: 0, screenshots: 5, closing: ["/training/dax-deep-dive/", "/training/"] },
  { route: narrative, title: "Smart narrative and text box dynamic values | burningsuit", heading: "Using dynamic values in the smart narrative and text box", byline: "Alison Box · 3 October 2022", notes: 0, screenshots: 14, closing: ["/training/power-bi-fundamentals/", "/training/"] },
  { route: xAxis, title: "Continuous x-axis on a column chart by month | burningsuit", heading: "Using a continuous x-axis on column charts for year and month labels", byline: "Alison Box · 28 April 2022", notes: 0, screenshots: 6, closing: ["/training/power-bi-fundamentals/", "/training/"] },
  { route: restApis, title: "Call a REST API from Power Query | burningsuit", heading: "I have the Power(query): using Power Query to call REST APIs", author: "Alan Harman-Box", byline: "Alan Harman-Box · 27 September 2021", notes: 0, screenshots: 13, closing: ["/training/power-bi-fundamentals/", "/training/"] },
  { route: filtering, title: "Filtering using DAX measures | burningsuit", heading: "Filtering using DAX measures", byline: "Alison Box · 17 August 2022", notes: 0, screenshots: 9, closing: ["/training/dax-fundamentals/", "/training/"] },
];

for (const post of posts) {
  test(`restored post keeps its author's text, byline and dated notes: ${post.route}`, async ({ page }) => {
    expect((await page.goto(post.route))?.status()).toBe(200);
    await expectIndexable(page, { article: true });
    await expect(page).toHaveTitle(post.title);
    await expect(page.locator("h1")).toHaveText(post.heading);
    await expect(page.locator(".title-band .eyebrow")).toHaveText("Writing · Archive");
    const author = post.author ?? "Alison Box";
    await expect(page.locator('meta[name="author"]')).toHaveAttribute("content", author);
    await expect(page.locator(".article-byline")).toHaveText(post.byline);
    await expect(page.locator(".article-appearances p")).toHaveText(post.notice ? [post.notice, "Update notes are by Alan Harman-Box."] : []);
    // The JSON-LD Article credits the post's own author.
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)["@graph"] as Record<string, unknown>[];
    expect(graph.find((node) => node["@type"] === "Article")?.author).toEqual(author === "Alan Harman-Box" ? { "@id": "https://burningsuit.co.uk/#person-alan" } : { "@type": "Person", name: author });
    // Her prose, unchanged: every paragraph and list item outside the notes.
    const approved = prose[post.route];
    const paras = await page.locator(".archive-prose > p, .archive-prose > :is(ol, ul) > li").allTextContents();
    expect(paras).toHaveLength(prose[post.route].paragraphCount);
    expect(createHash("sha256").update(paras.map((p) => p.replace(/\s+/g, " ").trim()).join("\n")).digest("hex")).toBe(prose[post.route].sha256);
    // Her headings, as approved.
    expect((await page.locator(".archive-prose > :is(h2, h3)").allTextContents()).map(squash)).toEqual(approved.headings);
    // Each update note is set apart, dated and exactly as approved: its sentences, any code and any table.
    const notes = page.locator(".update-note[role=note]");
    await expect(notes).toHaveCount(post.notes);
    expect(approved.notes).toHaveLength(post.notes);
    for (const [index, expected] of approved.notes.entries()) {
      const note = notes.nth(index);
      expect((await note.locator(":scope > p").allTextContents()).map(squash)).toEqual(expected.paragraphs);
      expect(expected.paragraphs[0]).toMatch(/^Update, November 2026: /);
      await expect(note.locator(".case-code")).toHaveCount(expected.code ? 1 : 0);
      if (expected.code) expect(await note.locator(".case-code").textContent()).toBe(expected.code);
      const rows = await note.locator("tr").evaluateAll((trs) => trs.map((tr) => Array.from(tr.children, (cell) => cell.textContent!.trim())));
      expect(rows).toEqual(expected.table ?? []);
    }
    // Screenshots: optimised, sized and lazy, each with exactly the approved alt text, in order, and each decodes once
    // scrolled into view.
    const shots = page.locator(".screenshot img");
    await expect(shots).toHaveCount(post.screenshots);
    expect(await shots.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")))).toEqual(approved.alts);
    for (const img of await shots.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(img).toHaveAttribute("loading", "lazy");
      await expect(img).toHaveAttribute("width", /^\d+$/);
      await expect(img).toHaveAttribute("height", /^\d+$/);
      expect(await img.getAttribute("src")).toMatch(/\.webp$/);
    }
    expect(await page.locator(".archive-next a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual(post.closing);
    // No newsletter or other form on an archive post, no client rendering.
    await expect(page.locator("form, astro-island, iframe, [style]")).toHaveCount(0);
    await expect(page.locator(otherScripts)).toHaveCount(0);
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoHorizontalScroll(page);
    }
  });
  visualReview(post.route);
}

test("DAX keeps its line breaks and indentation, and the corrected measure follows the original", async ({ page }) => {
  await page.goto(eighth);
  const percentOfParent = page.locator(".case-code").filter({ hasText: "% of Parent =" });
  expect(await percentOfParent.textContent()).toBe("% of Parent =\nIF (\n    ISINSCOPE ( Wines[WINE] ),\n    DIVIDE ( [Total Sales], [All Wine] ),\n    DIVIDE ( [Total Sales], [All Years] )\n)\n");
  await page.goto(topN);
  const measures = page.locator(".case-code").filter({ hasText: "Top/Bottom Percent =" });
  await expect(measures).toHaveCount(2);
  await expect(measures.nth(0)).toContainText("VAR Top_PC =CALCULATE ( [_Total Sales] ,\n                FILTER ( Customers,Customers[Customers Ranked Bottom]<= Rank_To_Find))");
  expect(await measures.nth(1).evaluate((el) => !!el.closest(".update-note"))).toBe(true);
  await expect(measures.nth(1)).toContainText("FILTER ( Customers, Customers[Customers Ranked Top] <= Rank_To_Find ) )\nVAR Bottom_PC =");
  await page.goto(bins);
  await expect(page.locator(".update-note table tr")).toHaveCount(6);
});

visualReview("/writing/");

// Alan's essay as approved (the ops repo's site/writing-three-numbers-copy.md): the prose as built hashes to the approved
// text, its section headings are h2s, and it ends with the related links and the newsletter sign-up.
test("the three-numbers essay renders Alan's approved prose, dated, with its headings and links", async ({ page }) => {
  const articleProse = JSON.parse(readFileSync(new URL("./fixtures/article-prose.json", import.meta.url), "utf8"))["three-numbers"] as { paragraphCount: number; sha256: string };
  expect((await page.goto(threeNumbers))?.status()).toBe(200);
  await expectIndexable(page, { article: true });
  await expect(page).toHaveTitle("AI dashboards: data democracy or demagoguery? | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Power BI and Claude now build a dashboard on request. Why the work that made dashboards worth having still has to happen, and how to do it on purpose.");
  await expect(page.locator("h1")).toHaveText("Data democracy or data demagoguery?");
  await expect(page.locator("h1 .em")).toHaveText("demagoguery");
  await expect(page.locator(".title-band .eyebrow")).toHaveText("Writing · Essay");
  await expect(page.locator(".title-band .standfirst")).toHaveText("When anyone can have a dashboard by teatime");
  await expect(page.locator(".article-byline")).toHaveText("Alan Harman-Box · 20 November 2026");
  await expect(page.locator(".article-byline time")).toHaveAttribute("datetime", "2026-11-20");
  await expect(page.locator(".case-chapter h2")).toHaveText(["I can see clearly now", "So what's new?", "Lies, damned lies, and dashboards", "Kicking and screaming", "Plus ça change"]);
  // The five practices sit under "Kicking and screaming" as h3s in the prose column, not beside it.
  await expect(page.locator('section[aria-labelledby="kicking-and-screaming"] .case-prose h3')).toHaveText([
    "Say why before anything gets built", "Find out what has been decided for you", "Run a pre-mortem",
    "Make the counter-dashboard ordinary", "Keep fewer dashboards, for longer, and look at them together",
  ]);
  await expect(page.locator("h3")).toHaveCount(5);
  // On wide screens a section's heading stays in view while its section is on screen; stacked on phones it scrolls normally.
  const position = () => page.locator(".case-chapter h2").first().evaluate((el) => getComputedStyle(el).position);
  await page.setViewportSize({ width: 1366, height: 900 });
  expect(await position()).toBe("sticky");
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await position()).toBe("static");
  const paras = (await page.locator(".article-intro p, .case-prose p").allTextContents()).map(squash);
  expect(paras).toHaveLength(articleProse.paragraphCount);
  expect(createHash("sha256").update(paras.join("\n")).digest("hex")).toBe(articleProse.sha256);
  expect(await page.locator(".case-prose a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([
    "https://community.fabric.microsoft.com/blog/fbc_pbiupdatesblog/power-bi%E2%80%99s-next-chapter-the-evolution-of-business-intelligence/5369131",
    "https://claude.com/resources/articles/dashboards-and-motion",
    "https://doi.org/10.1006/ccog.1999.0386",
    "https://doi.org/10.48550/arXiv.2310.13548",
    "https://doi.org/10.1016/0005-1098(83)90046-8",
    "https://hbr.org/2007/09/performing-a-project-premortem",
    "https://doi.org/10.1037/a0016755",
    "/training/power-bi-with-ai-agents-101/", "/power-bi/", essay,
  ]);
  await expect(page.locator("form.newsletter-form")).toHaveAttribute("action", NEWSLETTER.action);
  await expect(page.locator("main img, iframe, astro-island, [style]")).toHaveCount(0);
  await expect(page.locator(otherScripts)).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});
visualReview(threeNumbers);

// Alan's MCP article as approved (the ops repo's site/writing-power-bi-mcp-server-approved.md): the prose as built
// hashes to the approved text, its section headings are h2s, and its one figure carries the approved caption.
test("the MCP server article renders Alan's approved prose, its figure and its links", async ({ page }) => {
  const articleProse = JSON.parse(readFileSync(new URL("./fixtures/article-prose.json", import.meta.url), "utf8"))["the-power-bi-mcp-server-explained"] as { paragraphCount: number; sha256: string };
  expect((await page.goto(mcp))?.status()).toBe(200);
  await expectIndexable(page, { article: true });
  await expect(page).toHaveTitle("The Power BI MCP server, explained | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "What Power BI's MCP servers do, why the agent already knows plenty without one, and when to bother setting one up.");
  await expect(page.locator("h1")).toHaveText("The Power BI MCP server, explained for people who don't code");
  await expect(page.locator(".title-band .eyebrow")).toHaveText("Writing · Article");
  await expect(page.locator("h1 .em")).toHaveText("explained");
  await expect(page.locator(".title-band .standfirst")).toHaveText("A Power BI MCP server gives an AI agent tools to work on your Power BI model directly: querying it and, with Microsoft's Authoring server, changing it. Here's what that means, and why you don't necessarily need one to start.");
  await expect(page.locator(".article-byline time")).toHaveAttribute("datetime", "2026-11-20");
  await expect(page.locator(".case-chapter h2")).toHaveText(["We've got to install Microwave Ovens", "What you'd actually be setting up", "The risk you should know about", "Start with files", "The gap you'll feel", "Where to start"]);
  const paras = (await page.locator(".article-intro p, .case-prose > p").allTextContents()).map(squash);
  expect(paras).toHaveLength(articleProse.paragraphCount);
  expect(createHash("sha256").update(paras.join("\n")).digest("hex")).toBe(articleProse.sha256);
  const figure = page.locator('section[aria-labelledby="the-gap-youll-feel"] figure.essay-figure');
  await expect(figure).toHaveCount(1);
  await expect(figure.locator("figcaption")).toHaveText("Figure 1: Three steps. Start with files. Climb to the next step when checking by hand starts to grate, not before.");
  await expect(figure.locator("img")).toHaveAttribute("alt", /Files only.*MCP server.*Desktop Bridge/);
  expect(await page.locator(".case-prose a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([
    "https://learn.microsoft.com/power-bi/developer/mcp/power-bi-authoring-mcp",
    "https://learn.microsoft.com/en-us/power-bi/developer/mcp/mcp-servers-overview",
    "https://learn.microsoft.com/power-bi/developer/agentic/power-bi-desktop-bridge-overview",
    essay, "/training/power-bi-with-ai-agents-101/", "/training/",
  ]);
  await expect(page.locator("form.newsletter-form")).toHaveAttribute("action", NEWSLETTER.action);
  await expect(page.locator("iframe, astro-island, [style]")).toHaveCount(0);
  await expect(page.locator(otherScripts)).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});
visualReview(mcp);

// Alan's Power Query if statement article as approved (the ops repo's site/writing-power-query-if-statement-approved.md):
// the prose as built hashes to the approved text, its code keeps its lines, and its one screenshot is optimised and lazy.
test("the Power Query if statement article renders Alan's approved prose, code, screenshot and links", async ({ page }) => {
  const articleProse = JSON.parse(readFileSync(new URL("./fixtures/article-prose.json", import.meta.url), "utf8"))["power-query-if-statement"] as { paragraphCount: number; sha256: string };
  expect((await page.goto(pqIf))?.status()).toBe(200);
  await expectIndexable(page, { article: true });
  await expect(page).toHaveTitle("Power Query if statement in Power BI | burningsuit");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Use the Conditional column button or write if then else in M. How the Power Query if statement works in Power BI, with the common mistake that trips people up.");
  await expect(page.locator("h1")).toHaveText("How to write a Power Query if statement in Power BI");
  await expect(page.locator("h1 .em")).toHaveText("if statement");
  await expect(page.locator(".title-band .eyebrow")).toHaveText("Writing · Article");
  // The lead's backtick span is code on the page; no backticks reach the head (meta or JSON-LD) or the visible lead.
  await expect(page.locator(".title-band .standfirst code")).toHaveText(["if condition then result else result", "IF()"]);
  expect(await page.locator("head").innerHTML()).not.toContain("`");
  await expect(page.locator(".title-band .standfirst")).toHaveText("Use the Conditional column button on the Add column tab, or write if condition then result else result in a custom column. No IF() brackets, lowercase keywords, and the else is required.");
  // The closing band points to the course this article leads to, not the 101.
  await expect(page.locator(".article-related .links a").first()).toHaveAttribute("href", "/training/power-bi-fundamentals/");
  await expect(page.locator(".article-related")).not.toContainText("Power BI with AI agents 101");
  // Article structured data carries an image.
  expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('"image":"https://')]));
  await expect(page.locator(".article-byline time")).toHaveAttribute("datetime", "2026-11-20");
  await expect(page.locator(".case-chapter h2")).toHaveText(["The button that writes it for you", "When you need to write it yourself", "Excel muscle memory", "Where to practise this"]);
  const paras = (await page.locator(".case-prose > p, .case-prose > ol > li").allTextContents()).map(squash);
  expect(paras).toHaveLength(articleProse.paragraphCount);
  expect(createHash("sha256").update(paras.join("\n")).digest("hex")).toBe(articleProse.sha256);
  expect(await page.locator(".case-code").allTextContents()).toEqual([
    'if [Amount] > 500 then "Large" else "Standard"\n',
    'if [Amount] > 1000 then "Priority"\nelse if [Amount] > 500 then "Large"\nelse "Standard"\n',
    'if [Amount] > 500 and [CustomerGroup] = "Gold" then 0.1 else 0\n',
    'IF([Amount] > 500, "Large", "Standard")\n',
    'Order Size = IF(Sales[Amount] > 500, "Large", "Standard")\n',
  ]);
  const shot = page.locator('section[aria-labelledby="the-button-that-writes-it-for-you"] .screenshot img');
  await expect(page.locator(".screenshot img")).toHaveCount(1);
  await expect(shot).toHaveAttribute("alt", "The Add conditional column dialog, with one clause testing whether Amount is greater than 500 and an else value of Standard.");
  await expect(shot).toHaveAttribute("loading", "lazy");
  await expect(shot).toHaveAttribute("width", /^\d+$/);
  await expect(shot).toHaveAttribute("height", /^\d+$/);
  expect(await shot.getAttribute("src")).toMatch(/\.webp$/);
  await shot.scrollIntoViewIfNeeded();
  await expect.poll(() => shot.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator(".screenshot figcaption")).toHaveCount(0);
  // Tap to enlarge: a plain link to the full-size source file, named for what it opens.
  const enlarge = page.locator(".screenshot a.screenshot-enlarge");
  await expect(enlarge).toHaveCount(1);
  await expect(enlarge).toHaveAccessibleName("The Add conditional column dialog, with one clause testing whether Amount is greater than 500 and an else value of Standard. (opens the full-size image)");
  const full = await enlarge.getAttribute("href");
  expect(full).toMatch(/^\/_astro\/add-conditional-column\.[\w-]+\.png$/);
  const response = await page.request.get(full!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect(await page.locator(".case-prose a:not(.screenshot-enlarge)").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([
    "https://learn.microsoft.com/powerquery-m/m-spec-conditionals",
    roche, "/training/power-bi-fundamentals/", "/training/",
  ]);
  await expect(page.locator("form.newsletter-form")).toHaveAttribute("action", NEWSLETTER.action);
  await expect(page.locator("iframe, astro-island, [style]")).toHaveCount(0);
  await expect(page.locator(otherScripts)).toHaveCount(0);
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalScroll(page);
  }
});
visualReview(pqIf);
