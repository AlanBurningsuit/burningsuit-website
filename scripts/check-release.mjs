// Technical checks can pass while the site is still a non-publishable shell.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const html = readFileSync(join(dist, "index.html"), "utf8");
const pages = readdirSync(dist, { recursive: true })
  .filter((name) => name.endsWith(".html"))
  .map((name) => readFileSync(join(dist, name), "utf8"));
const unfinished = pages.some((page) => /data-rebuild-placeholder/.test(page));
// A form without a delivery endpoint cannot send an enquiry.
const undelivered = pages.some((page) => [...page.matchAll(/<form\b[^>]*>/gi)]
  .some((form) => !/\saction=["']?(https:\/\/|\/(?!\/))[^"'\s>]+/i.test(form[0])));
const noindex = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(html);
if (unfinished || undelivered || noindex) {
  console.error("Release blocked: unfinished rebuild pages, a form without a delivery endpoint or a noindex homepage remain.");
  process.exit(1);
}
console.log("Release check passed: no rebuild placeholders, undelivered forms or noindex homepage.");
