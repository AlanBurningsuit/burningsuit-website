import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pages as reserved, redirects, reserved404Routes } from "../src/config/compatibility.mjs";

const dist = "dist";
const site = "https://burningsuit.co.uk";
const files = readdirSync(dist, { recursive: true }).filter((name) => name.endsWith(".html"));
assert(files.length, "No HTML pages: build first.");
const htmlAt = (path) => readFileSync(join(dist, path), "utf8");
const fileAt = (path) => path === "/" ? "index.html" : path.replace(/^\//, "").replace(/\/$/, "") + "/index.html";
const tags = (html, type) => [...html.matchAll(new RegExp("<" + type + "\\b[^>]*>", "gi"))].map((match) => match[0]);
const attr = (tag, name) => tag.match(new RegExp("\\b" + name + '="([^"]*)"', "i"))?.[1];
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

for (const [path, anchors] of Object.entries(reserved)) {
  const file = fileAt("/" + path);
  if (reserved404Routes.includes(path)) {
    check(!files.includes(file), "Reserved 404 route generated HTML: /" + path);
    check(!Object.keys(redirects).includes("/" + path), "Reserved 404 route became a redirect: /" + path);
    continue;
  }
  check(files.includes(file), "Missing reserved route: /" + path);
  if (!files.includes(file)) continue;
  for (const id of anchors) check(htmlAt(file).includes('id="' + id + '"'), "Missing reserved anchor: /" + path + "#" + id);
}
for (const [from, target] of Object.entries(redirects)) {
  const file = fileAt(from);
  check(files.includes(file), "Missing legacy redirect: " + from);
  if (!files.includes(file)) continue;
  const found = htmlAt(file).match(/<meta http-equiv="refresh" content="\d+;url=([^"]+)"/i);
  check(found && new URL(found[1], site).href === new URL(target, site).href, "Changed legacy redirect: " + from);
}
for (const file of files) {
  const html = htmlAt(file);
  const refresh = html.match(/<meta http-equiv="refresh" content="\d+;url=([^"]+)"/i);
  if (refresh) {
    const target = new URL(refresh[1], site);
    check(target.origin === site && files.includes(fileAt(target.pathname)), file + ": redirect target is not built.");
    if (target.hash && files.includes(fileAt(target.pathname))) {
      check(htmlAt(fileAt(target.pathname)).includes('id="' + decodeURIComponent(target.hash.slice(1)) + '"'), file + ": redirect fragment missing.");
    }
    continue;
  }
  const head = html.split("</head>")[0];
  const titles = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)];
  check(titles.length === 1 && titles[0][1].trim(), file + ": needs one non-empty title.");
  const metas = tags(head, "meta");
  const descriptions = metas.filter((tag) => attr(tag, "name") === "description");
  check(descriptions.length === 1 && attr(descriptions[0], "content")?.trim(), file + ": needs one description.");
  const noindex = metas.some((tag) => attr(tag, "name") === "robots" && /noindex/i.test(attr(tag, "content") ?? ""));
  const canonical = tags(head, "link").filter((tag) => attr(tag, "rel") === "canonical");
  const route = "/" + file.replace(/index\.html$/, "").replace(/\.html$/, "");
  check(noindex ? canonical.length === 0 : canonical.length === 1 && attr(canonical[0], "href")?.replace(/\/$/, "") === (site + route).replace(/\/$/, ""), file + ": invalid canonical/noindex combination.");
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  check(noindex ? schemas.length === 0 : schemas.length > 0, file + ": schema disagrees with indexing.");
  for (const block of schemas) {
    try {
      const data = JSON.parse(block[1]);
      check(data["@context"] && (data["@graph"] || data["@type"]), file + ": incomplete JSON-LD.");
    } catch { errors.push(file + ": invalid JSON-LD."); }
  }
  const og = (key) => metas.filter((tag) => attr(tag, "property") === key).map((tag) => attr(tag, "content"));
  try {
    assert.equal(og("og:image").length, 1);
    const image = new URL(og("og:image")[0]);
    assert.equal(image.origin, site);
    const png = readFileSync(join(dist, image.pathname));
    assert.equal(png.toString("latin1", 1, 4), "PNG");
    assert.equal(Number(og("og:image:width")[0]), png.readUInt32BE(16));
    assert.equal(Number(og("og:image:height")[0]), png.readUInt32BE(20));
    assert.equal(og("og:image:alt").length, 1);
    assert(og("og:image:alt")[0]?.trim());
  } catch { errors.push(file + ": invalid/missing Open Graph image or dimensions."); }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("SEO and compatibility checks passed (" + files.length + " HTML files).");
