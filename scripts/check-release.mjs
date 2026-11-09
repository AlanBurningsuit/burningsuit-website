// Technical checks can pass while the site still can't be published. This one fails unless the build is fully
// released: crawlable, listed in a sitemap, every page indexable except the deliberate few, and every form delivering.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const site = "https://burningsuit.co.uk";
// Pages kept out of search on purpose: the 404 and the enquiry results.
const unindexed = new Set(["404.html", "enquiry-received/index.html", "enquiry-error/index.html"]);
const problems = [];
const read = (name) => readFileSync(join(dist, name), "utf8");
const files = readdirSync(dist, { recursive: true }).map(String).filter((name) => name.endsWith(".html"));
const isNoindex = (html) => /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(html);
const isRedirect = (html) => /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html);
const fileFor = (url) => { const path = new URL(url).pathname; return path.endsWith("/") ? `${path.slice(1)}index.html` : path.slice(1); };

if (!files.includes("index.html")) problems.push("no homepage");
for (const name of files) {
  const html = read(name);
  if (/data-rebuild-placeholder/.test(html)) problems.push(`${name}: unfinished rebuild page`);
  // A form without a delivery endpoint cannot send an enquiry.
  if ([...html.matchAll(/<form\b[^>]*>/gi)].some((form) => !/\saction=["']?(https:\/\/|\/(?!\/))[^"'\s>]+/i.test(form[0]))) problems.push(`${name}: form without a delivery endpoint`);
  if (isRedirect(html)) continue;
  const noindex = isNoindex(html);
  if (unindexed.has(name) && !noindex) problems.push(`${name}: should stay noindex`);
  if (!unindexed.has(name)) {
    if (noindex) problems.push(`${name}: noindex`);
    if (!/<link\b[^>]*rel=["']canonical["']/i.test(html)) problems.push(`${name}: no canonical link`);
  }
}

// Crawlers must be allowed in and pointed at a sitemap the build actually contains.
const robots = existsSync(join(dist, "robots.txt")) ? read("robots.txt") : "";
if (!robots) problems.push("no robots.txt");
if (/^\s*Disallow:\s*\/\s*$/im.test(robots)) problems.push("robots.txt disallows the whole site");
const sitemapUrl = robots.match(/^\s*Sitemap:\s*(\S+)/im)?.[1];
if (!sitemapUrl) problems.push("robots.txt names no sitemap");
else if (!sitemapUrl.startsWith(site) || !existsSync(join(dist, fileFor(sitemapUrl)))) problems.push(`robots.txt sitemap is not in the build: ${sitemapUrl}`);
else {
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const listed = locs(read(fileFor(sitemapUrl))).flatMap((url) => url.endsWith(".xml") ? (existsSync(join(dist, fileFor(url))) ? locs(read(fileFor(url))) : [`missing:${url}`]) : [url]);
  if (!listed.includes(`${site}/`)) problems.push("the sitemap leaves out the homepage");
  for (const url of listed) {
    const name = url.startsWith("missing:") ? "" : fileFor(url);
    if (!name || !files.includes(name)) problems.push(`sitemap lists a page that isn't built: ${url}`);
    else if (isNoindex(read(name)) || isRedirect(read(name))) problems.push(`sitemap lists a noindex or redirect page: ${url}`);
  }
}

if (problems.length) {
  console.error("Release blocked:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Release check passed: ${files.length} pages, all indexable but the deliberate few, robots and sitemap in place, every form delivering.`);
