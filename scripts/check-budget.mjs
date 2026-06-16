/**
 * Byte-budget gate. Scores don't gate bytes, so this does: it sums the gzipped
 * critical path (HTML + its linked CSS + external JS) per route, the total font
 * bytes, and each image, then FAILS the build (exit 1) over threshold.
 *
 * Budgets (from the plan — defined and enforced, not asserted):
 *   - critical path HTML + CSS + first-load JS  <= 60 KB gz   PER ROUTE
 *     (fonts + images excluded — they carry their own budgets below)
 *   - all fonts (woff2, already compressed)      <= 140 KB total
 *   - every image                                <  300 KB each
 *
 * Run after `npm run build`. The enhancement JS is inlined into each HTML by
 * Astro, so it's already inside the HTML's gzipped size; external JS, if any,
 * is added explicitly.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const CRITICAL_MAX = 60 * 1024;
const FONTS_MAX = 140 * 1024;
const IMAGE_MAX = 300 * 1024;

const all = readdirSync(DIST, { recursive: true }).map((f) => String(f).replaceAll("\\", "/"));
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1) + " KB";

let failed = false;

// ---- critical render path, per route ----
console.log("critical path (gzipped HTML + CSS + JS), per route:\n");
console.log("  " + "route".padEnd(34) + "html".padStart(9) + "assets".padStart(10) + "total".padStart(11));
for (const rel of all.filter((f) => f.endsWith(".html")).sort()) {
  const html = readFileSync(join(DIST, rel));
  const text = html.toString();
  const refs = [
    ...[...text.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
  ];
  let assetGz = 0;
  for (const href of refs) {
    try {
      assetGz += gz(readFileSync(join(DIST, href.replace(/^\//, ""))));
    } catch {
      /* off-site or missing — not part of our critical path */
    }
  }
  const htmlGz = gz(html);
  const total = htmlGz + assetGz;
  const over = total > CRITICAL_MAX;
  failed ||= over;
  const route = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
  console.log(
    "  " +
      route.padEnd(34) +
      kb(htmlGz).padStart(9) +
      kb(assetGz).padStart(10) +
      kb(total).padStart(11) +
      (over ? `  ✗ OVER ${kb(CRITICAL_MAX)}` : ""),
  );
}

// ---- fonts (woff2 already compressed — count raw bytes) ----
const fonts = all.filter((f) => f.endsWith(".woff2"));
const fontsTotal = fonts.reduce((s, f) => s + statSync(join(DIST, f)).size, 0);
const fontsOver = fontsTotal > FONTS_MAX;
failed ||= fontsOver;
console.log(
  `\nfonts: ${fonts.length} × woff2, ${kb(fontsTotal)} total (cap ${kb(FONTS_MAX)}) ` +
    (fontsOver ? "✗ OVER" : "✓"),
);

// ---- images < 300 KB each ----
const imgs = all.filter((f) => /\.(avif|webp|png|jpe?g|svg)$/i.test(f));
let imgOver = 0;
let biggest = 0;
for (const f of imgs) {
  const size = statSync(join(DIST, f)).size;
  biggest = Math.max(biggest, size);
  if (size > IMAGE_MAX) {
    imgOver++;
    failed = true;
    console.log(`image OVER: ${f} ${kb(size)} (cap ${kb(IMAGE_MAX)}) ✗`);
  }
}
console.log(
  `images: ${imgs.length} checked, biggest ${kb(biggest)} (cap ${kb(IMAGE_MAX)}) ` +
    (imgOver ? "✗" : "✓"),
);

if (failed) {
  console.error("\nbyte-budget gate FAILED\n");
  process.exit(1);
}
console.log("\nbyte-budget gate passed ✓\n");
