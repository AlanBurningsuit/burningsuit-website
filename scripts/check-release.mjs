// Technical checks can pass while the site is still a non-publishable shell.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const html = readFileSync(join(dist, "index.html"), "utf8");
const unfinished = readdirSync(dist, { recursive: true })
  .filter((name) => name.endsWith(".html"))
  .some((name) => /data-rebuild-placeholder/.test(readFileSync(join(dist, name), "utf8")));
if (unfinished || /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(html)) {
  console.error("Release blocked: unfinished rebuild pages or a noindex homepage remain.");
  process.exit(1);
}
console.log("Release check passed: no rebuild placeholders or noindex homepage.");
