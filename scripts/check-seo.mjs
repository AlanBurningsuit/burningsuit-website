/**
 * SEO / structured-data gate. The build proves pages RENDER; this proves every
 * page carries the head essentials and that any JSON-LD is actually valid —
 * the deterministic, non-negotiable slice of publish-readiness that no existing
 * gate covers. A model can't talk its way past it.
 *
 * Per built page (dist/**.html) it asserts:
 *   - exactly one non-empty <title>
 *   - exactly one non-empty <meta name="description">
 *   - exactly one <link rel="canonical"> with an absolute href
 *   - every <script type="application/ld+json"> parses as JSON and carries
 *     "@context" plus "@graph" (or "@type")
 *   - indexable pages emit ≥1 JSON-LD block; noindex pages (meta robots
 *     noindex) emit NONE — the schema gate and the index gate must agree
 *   - the Organization has its existing logo, resolved to an absolute URL and
 *     a built asset; Alan's LinkedIn belongs to the Person only
 *
 * Run after `npm run build` (needs dist/). FAILS the gate (exit 1) on any
 * violation. Mirrors scripts/check-budget.mjs in style.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
// The canonical origin. astro.config.mjs `site` is authoritative — keep in sync.
const SITE = "https://burningsuit.co.uk";
const ORG_LOGO_PATH = "social/burningsuit-mark-on-green.png";
const FOUNDER_PROFILE = "https://www.linkedin.com/in/alan-harman-box";

const all = readdirSync(DIST, { recursive: true }).map((f) => String(f).replaceAll("\\", "/"));
const pages = all.filter((f) => f.endsWith(".html")).sort();

// A dist with zero pages must never read as a pass ("checked 0 pages ✓").
if (pages.length === 0) {
  console.error("SEO gate FAILED — dist/ contains no .html pages (build first?)");
  process.exit(1);
}

const metaTags = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const linkTags = (html) => [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
};

let failed = false;
let redirectStubs = 0;
const problems = [];
const fail = (route, msg) => {
  failed = true;
  problems.push(`  ✗ ${route}  —  ${msg}`);
};

if (!pages.includes("writing/index.html")) fail("/writing/", "missing redirect to the first essay");
if (!pages.includes("writing/we-are-all-middle-management-now/index.html")) fail("/writing/", "first essay is missing from the build");

for (const rel of pages) {
  const route = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
  const html = readFileSync(join(DIST, rel), "utf8");
  // Astro static-redirect stubs (meta refresh + noindex + canonical→target)
  // are intentionally not real pages — exempt them from the page contract,
  // but verify the target they point at actually exists in this build. Stubs
  // are linked from nowhere, so the link checker never crawls them: without
  // this, renaming a page silently strands every stub pointing at it.
  // No real page emits meta refresh (BaseLayout doesn't; a hand-added one
  // would be a bug worth surfacing in review, not here).
  const refresh = html.match(/<meta http-equiv="refresh" content="\d+;url=([^"]+)"/i);
  if (refresh) {
    redirectStubs++;
    let targetUrl;
    try {
      targetUrl = new URL(refresh[1], SITE);
    } catch {
      fail(route, `redirect stub has an invalid target: ${refresh[1]}`);
      continue;
    }
    const target = targetUrl.pathname;
    const targetFile = (target.endsWith("/") ? target + "index.html" : target + "/index.html")
      .replace(/^\//, "");
    if (targetUrl.origin !== SITE || !pages.includes(targetFile)) {
      fail(route, `redirect stub points at ${targetUrl.href}, which is not in this build`);
    } else if (targetUrl.hash) {
      let fragment;
      try {
        fragment = decodeURIComponent(targetUrl.hash.slice(1));
      } catch {
        fail(route, `redirect stub has an invalid fragment: ${targetUrl.hash}`);
        continue;
      }
      const targetHtml = readFileSync(join(DIST, targetFile), "utf8");
      const ids = [...targetHtml.matchAll(/<[^>]+\bid="([^"]+)"/gi)].map((match) => match[1]);
      if (!ids.includes(fragment)) fail(route, `redirect fragment #${fragment} does not exist on ${target}`);
    }
    if (route === "/writing/" && (target !== "/writing/we-are-all-middle-management-now/" || targetUrl.hash)) {
      fail(route, "writing has no index yet: its redirect must lead directly to the first essay");
    }
    continue;
  }

  if (route === "/writing/") fail(route, "writing must remain a redirect until there is a second essay");

  // Head-only slice for the <title> count: an accessible inline-SVG <title>
  // in the body must not read as a duplicate document title.
  const headEnd = html.indexOf("</head>");
  const head = headEnd === -1 ? html : html.slice(0, headEnd);

  // <title>
  const titles = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => m[1].trim());
  if (titles.length !== 1) fail(route, `expected 1 <title> in <head>, found ${titles.length}`);
  else if (!titles[0]) fail(route, "<title> is empty");

  // <meta name="description">
  const descs = metaTags(html)
    .filter((t) => attr(t, "name") === "description")
    .map((t) => (attr(t, "content") ?? "").trim());
  if (descs.length !== 1) fail(route, `expected 1 meta description, found ${descs.length}`);
  else if (!descs[0]) fail(route, "meta description is empty");

  // robots noindex? (needed by the canonical rule below, and the JSON-LD rule)
  const noindex = metaTags(html).some(
    (t) => attr(t, "name") === "robots" && /noindex/i.test(attr(t, "content") ?? ""),
  );

  if (route.startsWith("/writing/") && noindex) fail(route, "essay page is unexpectedly noindexed");

  // <link rel="canonical"> — mirrors the JSON-LD rule: noindex pages emit NO
  // canonical (a canonical on a noindexed page is a mixed signal); indexable
  // pages emit exactly one, absolute, pointing at THIS route.
  const canons = linkTags(html)
    .filter((t) => attr(t, "rel") === "canonical")
    .map((t) => attr(t, "href"));
  if (noindex) {
    if (canons.length) fail(route, `noindex page emits ${canons.length} canonical(s) — should emit none`);
  } else if (canons.length !== 1) fail(route, `expected 1 canonical, found ${canons.length}`);
  else if (!/^https?:\/\//.test(canons[0] ?? "")) fail(route, `canonical not absolute: ${canons[0]}`);
  else {
    // The canonical must point at THIS route on the production origin —
    // otherwise a single BaseLayout/site regression canonicalises every page
    // to the homepage (mass deindexing) while a presence-only check stays
    // green. Trailing-slash form is normalised, not asserted.
    const norm = (u) => u.replace(/\/+$/, "");
    const expected = SITE + route;
    if (norm(canons[0]) !== norm(expected)) {
      fail(route, `canonical ${canons[0]} does not match its route (expected ${expected})`);
    }
  }

  // JSON-LD blocks
  const blocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1]);

  if (noindex) {
    if (blocks.length) fail(route, `noindex page emits ${blocks.length} JSON-LD block(s) — should emit none`);
  } else {
    if (!blocks.length) fail(route, "indexable page has no JSON-LD");
    const nodes = [];
    for (const raw of blocks) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        fail(route, `JSON-LD does not parse: ${String(e.message).slice(0, 80)}`);
        continue;
      }
      if (!parsed["@context"]) fail(route, "JSON-LD missing @context");
      if (!parsed["@graph"] && !parsed["@type"]) fail(route, "JSON-LD missing @graph/@type");
      if (Array.isArray(parsed["@graph"])) nodes.push(...parsed["@graph"]);
      else if (parsed["@type"]) nodes.push(parsed);
    }
    const organizations = nodes.filter((node) => node?.["@type"] === "Organization");
    const people = nodes.filter((node) => node?.["@type"] === "Person");
    if (organizations.length !== 1) fail(route, `expected 1 Organization, found ${organizations.length}`);
    if (people.length !== 1) fail(route, `expected 1 Person, found ${people.length}`);
    const organization = organizations[0];
    const person = people[0];
    if (organization) {
      if (organization.logo !== `${SITE}/${ORG_LOGO_PATH}`) {
        fail(route, "Organization logo must be the absolute URL of the existing company PNG");
      }
      if (!all.includes(ORG_LOGO_PATH)) fail(route, "Organization logo is missing from dist/");
      const profiles = Array.isArray(organization.sameAs) ? organization.sameAs : [organization.sameAs];
      if (profiles.includes(FOUNDER_PROFILE)) fail(route, "Organization sameAs contains Alan's personal LinkedIn");
    }
    if (person && (!Array.isArray(person.sameAs) || !person.sameAs.includes(FOUNDER_PROFILE))) {
      fail(route, "Person sameAs is missing Alan's confirmed LinkedIn");
    }
    if (route.startsWith("/writing/") && route !== "/writing/") {
      const articles = nodes.filter((node) => node?.["@type"] === "Article");
      const breadcrumbs = nodes.filter((node) => node?.["@type"] === "BreadcrumbList");
      if (articles.length !== 1) fail(route, `expected 1 essay Article, found ${articles.length}`);
      if (breadcrumbs.length !== 1) fail(route, `expected 1 essay BreadcrumbList, found ${breadcrumbs.length}`);
      const article = articles[0];
      if (article) {
        if (article.author?.["@id"] !== person?.["@id"]) fail(route, "essay author must reference Alan's Person node");
        if (article.publisher?.["@id"] !== organization?.["@id"]) fail(route, "essay publisher must reference the Organization node");
        if (article.url !== SITE + route || article.mainEntityOfPage !== SITE + route) fail(route, "essay Article must identify its own canonical page");
        if (typeof article.headline !== "string" || !article.headline.trim()) fail(route, "essay Article headline is empty");
        const publishedTags = metaTags(head).filter((tag) => attr(tag, "property") === "article:published_time");
        const modifiedTags = metaTags(head).filter((tag) => attr(tag, "property") === "article:modified_time");
        for (const [field, tags] of [["datePublished", publishedTags], ["dateModified", modifiedTags]]) {
          const value = article[field];
          if (value === undefined) {
            if (tags.length) fail(route, `${field} is absent in Article but its Open Graph date is emitted`);
          } else {
            const date = typeof value === "string" ? new Date(value) : new Date(NaN);
            if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) fail(route, `essay ${field} must be a valid ISO timestamp`);
            if (tags.length !== 1 || attr(tags[0], "content") !== value) fail(route, `essay ${field} must match one Open Graph date`);
          }
        }
        if (article.dateModified && !article.datePublished) fail(route, "essay modification date needs a publication date");
        if (article.datePublished && article.dateModified && new Date(article.dateModified) < new Date(article.datePublished)) fail(route, "essay modification date precedes publication");
      }
      const items = breadcrumbs[0]?.itemListElement;
      if (!Array.isArray(items) || items.length !== 2) {
        fail(route, "essay breadcrumb must be Home → title, with no Writing index crumb");
      } else {
        if (items[0].position !== 1 || items[0].name !== "Home" || items[0].item !== `${SITE}/`) fail(route, "essay breadcrumb must start at Home");
        if (items[1].position !== 2 || items[1].item !== SITE + route || typeof items[1].name !== "string" || !items[1].name.trim()) fail(route, "essay breadcrumb must end at its own title and URL");
      }
    }
  }
}

console.log(
  `SEO gate: checked ${pages.length - redirectStubs} pages (${redirectStubs} redirect stubs skipped)`,
);
if (failed) {
  console.error(`\nSEO gate FAILED — ${problems.length} problem(s):\n${problems.join("\n")}\n`);
  process.exit(1);
}
console.log("SEO gate passed ✓ (title, description, canonical, JSON-LD and identity on every page)\n");
