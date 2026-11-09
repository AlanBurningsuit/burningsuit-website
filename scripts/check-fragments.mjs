// Fragment check: every internal link with a #fragment must land on an element with that id (or an <a name>) in the
// built page it points to. Linkinator checks that pages exist, not their fragments, so this parses dist/ itself.
//
//   node scripts/check-fragments.mjs [dist]
//
// A link into a redirect stub is followed to the stub's target once; a fragment the stub's target URL already carries
// is checked by check:seo.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "parse5";

const SITE = "https://burningsuit.co.uk";

/** Every element in a parse5 tree, depth first. */
function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (child.tagName) yield child;
    yield* elements(child);
    if (child.content) yield* elements(child.content);
  }
}
const attr = (element, name) => element.attrs?.find((a) => a.name === name)?.value;

/** The dist/ file a site path is served from, or null when the build has none. */
function fileFor(files, pathname) {
  const path = decodeURIComponent(pathname).replace(/^\//, "");
  for (const candidate of path === "" ? ["index.html"] : path.endsWith("/") ? [`${path}index.html`] : [path, `${path}/index.html`, `${path}.html`]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

/** Checks a built site. Returns the number of fragment links checked and the problems as "<source> -> <href>: <reason>" lines. */
export function checkFragments(dist = "dist") {
  if (!existsSync(dist)) return { checked: 0, problems: [`${dist}: missing (build first)`] };
  const files = new Set(readdirSync(dist, { recursive: true }).map((name) => String(name).replaceAll("\\", "/")).filter((name) => name.endsWith(".html")));
  const pages = new Map();
  const page = (file) => {
    if (!pages.has(file)) {
      const doc = parse(readFileSync(join(dist, file), "utf8"));
      const ids = new Set();
      const links = [];
      let refresh = null;
      for (const el of elements(doc)) {
        const id = attr(el, "id");
        if (id) ids.add(id);
        if (el.tagName === "a" && attr(el, "name")) ids.add(attr(el, "name"));
        if ((el.tagName === "a" || el.tagName === "area") && attr(el, "href") !== undefined) links.push(attr(el, "href"));
        if (el.tagName === "meta" && /^refresh$/i.test(attr(el, "http-equiv") ?? "")) refresh = (attr(el, "content") ?? "").match(/url=(.+)$/i)?.[1] ?? null;
      }
      pages.set(file, { ids, links, refresh });
    }
    return pages.get(file);
  };

  const problems = [];
  let checked = 0;
  for (const source of [...files].sort()) {
    const base = new URL(`/${source.replace(/(^|\/)index\.html$/, (_, slash) => slash)}`, SITE);
    for (const href of page(source).links) {
      let url;
      try { url = new URL(href, base); } catch { continue; }
      if (url.origin !== SITE || !url.hash || url.hash === "#") continue;
      const fragment = decodeURIComponent(url.hash.slice(1));
      let target = fileFor(files, url.pathname);
      // A link to a redirect stub lands on the stub's target.
      const stub = target && page(target).refresh;
      if (stub) target = fileFor(files, new URL(stub, SITE).pathname);
      if (!target) continue; // Missing pages are linkinator's to report.
      checked++;
      // "#top" scrolls to the top of any HTML document without a matching element.
      if (!page(target).ids.has(fragment) && fragment.toLowerCase() !== "top") problems.push(`${source} -> ${href}: no element with id "${fragment}" in ${target}`);
    }
  }
  return { checked, problems };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { checked, problems } = checkFragments(process.argv[2] ?? "dist");
  for (const line of problems) console.error(`Broken fragment: ${line}`);
  console.log(`Fragment check: ${problems.length || !checked ? "failed" : "passed"} (${checked} fragment links).`);
  if (problems.length || !checked) process.exit(1);
}
