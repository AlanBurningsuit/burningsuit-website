import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect, otherScripts } from "./analytics";
import { visualReview, expectIndexable, expectNoHorizontalScroll } from "./helpers";
import { redirects } from "../src/config/compatibility.mjs";

// The Writing index and Alison Box's restored posts (approved copy: the ops repo's site/writing-restored-posts-copy.md).
const essay = "/writing/we-are-all-middle-management-now/";
const roche = "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/";
const secrets = "/blog/2019/04/7-secrets-of-the-matrix-visual/";
const eighth = "/blog/2020/10/the-8th-secret-of-the-matrix-visual-controlling-calculations-and-labels-on-subtotals/";
const bins = "/blog/2020/01/categorising-measures-into-numeric-ranges-or-bins/";
const topN = "/blog/2019/05/find-top-or-bottom-n-percent-dax/";
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
  expect(await lists.nth(0).locator("a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([essay]);
  await expect(lists.nth(0).locator("li")).toHaveText(["We're all middle management now Alan Harman-Box · Talk, February 2026 Agentic development in Power BI: what an agent is, how far to trust its work, and what handing work to it costs."], { useInnerText: true });
  await expect(page.getByRole("heading", { level: 2, name: "From the archive" })).toBeVisible();
  expect(await lists.nth(1).locator("a").evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([roche, eighth, bins, topN, secrets]);
  await expect(lists.nth(1).locator("h3")).toHaveText([
    "Where do I make data transformations in Power BI? Roche's Maxim",
    "The 8th secret of the matrix visual: controlling calculations and labels on subtotals",
    'Categorising measures into numeric ranges or "bins"',
    "Best and worst: two approaches to finding top or bottom N percent using DAX",
    "7 secrets of the matrix visual",
  ]);
  await expect(lists.nth(1).locator(".writing-entry-meta")).toHaveText(["Stuart Box · March 2021", "Alison Box · October 2020", "Alison Box · January 2020", "Alison Box · May 2019", "Alison Box · April 2019, revised July 2022"]);
  await expect(lists.nth(1).locator("p:not(.writing-entry-meta)")).toHaveText([
    "Roche's Maxim: transform data as far upstream as possible, as far downstream as necessary. Stuart Box's 2021 post, which Matthew Roche credited as the first on it.",
    "Use ISINSCOPE to give Power BI matrix subtotals their own calculation, such as % of parent row total, and give each subtotal level its own label.",
    "Count how many customers' total sales fall into each numeric range, or bin, with an unrelated table of ranges and one DAX measure in Power BI.",
    "Find your top or bottom 10 percent of customers by sales in DAX: rank them with RANKX, then use a fixed percentage or slicers that choose it.",
    "Seven matrix visual secrets in Power BI: grand totals, expanding a level, layout, per-level subtotals, values on rows, text values, conditional formatting.",
  ]);
  // A plain list: no images, no scripts beyond the shared tag, no form.
  await expect(page.locator("main img, main form")).toHaveCount(0);
  await expect(page.locator(otherScripts)).toHaveCount(0);
  const sitemap = await (await page.request.get("/sitemap-0.xml")).text();
  for (const route of ["/writing/", secrets, eighth, bins, topN]) expect(sitemap).toContain(`<loc>https://burningsuit.co.uk${route}</loc>`);
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
  };
  for (const [from, to] of Object.entries(expected)) {
    expect(redirectMap[from], from).toBe(to);
    await page.goto(from + "/");
    await expect(page, from).toHaveURL(new RegExp(`${to.replaceAll("/", "\\/")}$`));
  }
  // The restored pages are pages again, not redirect stubs; other old posts still lead to Consultancy.
  for (const route of [secrets, eighth, bins, topN]) expect(redirectMap[route.replace(/\/$/, "")]).toBeUndefined();
  expect(redirectMap["/blog/7-secrets-line-chart"]).toBe("/power-bi/");
  expect(redirectMap["/blog/2020/07/7-secrets-of-the-pie-chart"]).toBe("/power-bi/");
});

const posts: { route: string; title: string; heading: string; byline: string; notice: string; notes: number; screenshots: number; closing: string[] }[] = [
  { route: secrets, title: "7 secrets of the matrix visual in Power BI | burningsuit", heading: "7 secrets of the matrix visual", byline: "Alison Box · 9 April 2019 · Revised by Alison Box, July 2022", notice: "This post has dated update notes where Power BI has changed since it was written.", notes: 2, screenshots: 19, closing: ["/training/dax-fundamentals/", "/training/"] },
  { route: eighth, title: "The 8th secret of the matrix visual: subtotals | burningsuit", heading: "The 8th secret of the matrix visual: controlling calculations and labels on subtotals", byline: "Alison Box · 26 October 2020", notice: "This post has a dated update note where Power BI has changed since it was written.", notes: 1, screenshots: 6, closing: ["/training/dax-deep-dive/", "/training/"] },
  { route: bins, title: "Group a DAX measure into numeric ranges (bins) | burningsuit", heading: 'Categorising measures into numeric ranges or "bins"', byline: "Alison Box · 22 January 2020", notice: "This post has dated update notes where Power BI has changed, and where its screenshots have been lost.", notes: 4, screenshots: 0, closing: ["/training/dax-fundamentals/", "/training/"] },
  { route: topN, title: "Top or bottom N percent in DAX | burningsuit", heading: "Best and worst: two approaches to finding top or bottom N percent using DAX", byline: "Alison Box · 19 May 2019", notice: "This post has dated update notes, including a correction to the measure in Approach No. 2.", notes: 4, screenshots: 8, closing: ["/training/dax-fundamentals/", "/training/dax-deep-dive/", "/training/"] },
];

for (const post of posts) {
  test(`restored post keeps Alison Box's text, byline and dated notes: ${post.route}`, async ({ page }) => {
    expect((await page.goto(post.route))?.status()).toBe(200);
    await expectIndexable(page, { article: true });
    await expect(page).toHaveTitle(post.title);
    await expect(page.locator("h1")).toHaveText(post.heading);
    await expect(page.locator(".title-band .eyebrow")).toHaveText("Archive");
    await expect(page.locator('meta[name="author"]')).toHaveAttribute("content", "Alison Box");
    await expect(page.locator(".article-byline")).toHaveText(post.byline);
    await expect(page.locator(".article-appearances p")).toHaveText([post.notice, "Update notes are by Alan Harman-Box."]);
    // The JSON-LD Article credits her, not the site's founder.
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)["@graph"] as Record<string, unknown>[];
    expect(graph.find((node) => node["@type"] === "Article")?.author).toEqual({ "@type": "Person", name: "Alison Box" });
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
