// Writes /llms.txt (llmstxt.org) after the build: a plain-text map of the indexed pages for AI answer engines.
// It adds no wording of its own beyond section labels: every line is a built page's own title and meta description,
// so it can't drift from approved copy. Redirect stubs and noindex pages are left out, as they are from the sitemap.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeHTML } from "entities";

const SITE = "https://burningsuit.co.uk";
// Section label, and which paths belong to it; first match wins, listed in this order.
const SECTIONS = [
  ["Courses", (path) => path.startsWith("/training/")],
  ["Consultancy", (path) => path === "/power-bi/" || path === "/call/"],
  ["Case studies", (path) => path.startsWith("/work/")],
  ["Writing", (path) => path.startsWith("/writing/") || path.startsWith("/blog/")],
  ["About and contact", (path) => path === "/about/" || path === "/contact/"],
  ["Optional", (path) => path.startsWith("/privacy/")],
];

const meta = (html, pattern) => { const found = html.match(pattern)?.[1]; return found === undefined ? undefined : decodeHTML(found).trim(); };

/** The indexed pages in dist, as { path, title, description }, home first then alphabetical. */
export function indexedPages(dist) {
  return readdirSync(dist, { recursive: true }).map(String).map((name) => name.replaceAll("\\", "/"))
    .filter((name) => name.endsWith("index.html"))
    .map((name) => ({ path: "/" + name.replace(/index\.html$/, ""), html: readFileSync(join(dist, name), "utf8") }))
    .filter(({ html }) => !/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html) && !/<meta\b[^>]*name=["']robots["'][^>]*noindex/i.test(html))
    .map(({ path, html }) => ({
      path,
      title: meta(html, /<title>([^<]*)<\/title>/i)?.replace(/\s+\|\s+burningsuit$/, ""),
      description: meta(html, /<meta name="description" content="([^"]*)"/i),
    }))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
}

export function llmsTxt(dist) {
  const pages = indexedPages(dist);
  const home = pages.find((page) => page.path === "/");
  if (!home?.description) throw new Error("llms.txt: the homepage has no description.");
  const unsorted = pages.filter((page) => page.path !== "/" && !SECTIONS.some(([, belongs]) => belongs(page.path)));
  if (unsorted.length) throw new Error("llms.txt: no section for " + unsorted.map((page) => page.path).join(", "));
  const lines = ["# burningsuit", "", `> ${home.description}`, ""];
  for (const [label, belongs] of SECTIONS) {
    const members = pages.filter((page) => page.path !== "/" && belongs(page.path));
    if (!members.length) continue;
    lines.push(`## ${label}`, "", ...members.map((page) => `- [${page.title}](${SITE}${page.path}): ${page.description}`), "");
  }
  return lines.join("\n");
}

/** Astro integration: runs once the static pages are written. */
export default function llmsTxtIntegration() {
  return {
    name: "burningsuit-llms-txt",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const dist = fileURLToPath(dir);
        writeFileSync(join(dist, "llms.txt"), llmsTxt(dist));
      },
    },
  };
}
