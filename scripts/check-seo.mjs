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
 *
 * Run after `npm run build` (needs dist/). FAILS the gate (exit 1) on any
 * violation. Mirrors scripts/check-budget.mjs in style.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
// The canonical origin. astro.config.mjs `site` is authoritative — keep in sync.
const SITE = "https://burningsuit.co.uk";

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
const problems = [];
const fail = (route, msg) => {
  failed = true;
  problems.push(`  ✗ ${route}  —  ${msg}`);
};

for (const rel of pages) {
  const route = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
  const html = readFileSync(join(DIST, rel), "utf8");
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
    }
  }
}

console.log(`SEO gate: checked ${pages.length} pages`);
if (failed) {
  console.error(`\nSEO gate FAILED — ${problems.length} problem(s):\n${problems.join("\n")}\n`);
  process.exit(1);
}
console.log("SEO gate passed ✓ (title, description, canonical, valid JSON-LD on every page)\n");
