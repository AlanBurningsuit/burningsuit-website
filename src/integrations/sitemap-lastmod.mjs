// Sitemap <lastmod>, given only where it can be stated accurately (an inaccurate lastmod is worse than none).
// Writing: the entry's own dateModified, else its datePublished; an archive entry with only a month gets none.
// Every other page: the newest commit touching its source (the page file, a case study's MDX entry, and the
// page-specific data the page imports). Shared layouts and components don't count. With no full git history (a
// shallow clone) or an uncommitted change to a source, the page gets no lastmod rather than a wrong one.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { writingRoute } from "../config/writing-routes.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Data modules whose content renders on the pages that import them, with the files they read in turn.
const PAGE_DATA = {
  "src/lib/training-prices.mjs": ["src/config/training-prices.json"],
  "src/config/course-run.mjs": [],
  "src/config/starting-courses.mjs": [],
  "src/lib/private-course.ts": [],
};

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
};
let history;
/** True when the checkout has the full history that per-file commit dates need. */
export const hasFullHistory = () => (history ??= git(["rev-parse", "--is-shallow-repository"]) === "false");

/** The page file, plus its directly imported page data, for a built path such as "/training/". */
export function pageSources(pathname) {
  const route = pathname.replace(/^\/+|\/+$/g, "");
  const study = route.match(/^work\/([^/]+)$/);
  if (study) return ["src/pages/work/[slug].astro", `src/content/work/${study[1]}.mdx`].filter((file) => existsSync(join(root, file)));
  const page = [`src/pages/${route || "index"}.astro`, `src/pages/${route}/index.astro`].find((file) => existsSync(join(root, file)));
  if (!page) return [];
  const imports = [...readFileSync(join(root, page), "utf8").matchAll(/from\s+"(\.[^"]+)"/g)]
    .map((match) => posix.normalize(posix.join(posix.dirname(page), match[1])));
  const data = Object.entries(PAGE_DATA).filter(([module]) => imports.some((file) => module === file || module.replace(/\.[a-z]+$/, "") === file));
  return [page, ...data.flatMap(([module, reads]) => [module, ...reads])];
}

/** The writing entry's content date, or undefined when it has no day-level date. */
function writingDate(id) {
  const source = readFileSync(join(root, "src/content/writing", `${id}.mdx`), "utf8");
  const frontmatter = parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "") ?? {};
  const date = frontmatter.dateModified ?? frontmatter.datePublished;
  return date ? new Date(date) : undefined;
}

/** The lastmod for a built page URL, or undefined when it can't be stated accurately. */
export function lastmodFor(url) {
  const route = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  // Every Writing entry, at its fixed URL or the default writing/<id> (writingRoute), dates itself.
  const writing = readdirSync(join(root, "src/content/writing")).filter((file) => file.endsWith(".mdx")).map((file) => file.slice(0, -4)).find((id) => writingRoute(id) === route);
  if (writing) return writingDate(writing);
  const sources = pageSources(route);
  if (!sources.length || !hasFullHistory() || git(["status", "--porcelain", "--", ...sources]) !== "") return undefined;
  const date = git(["log", "-1", "--format=%cI", "--", ...sources]);
  return date ? new Date(date) : undefined;
}
