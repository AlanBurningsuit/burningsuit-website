// Brand check: src/styles/brand.css is a copy of ../burningsuit-brand/brand.css,
// and no source file writes a colour that brand.css doesn't define.
//
// The sibling comparison runs only where the brand checkout exists (locally);
// CI has just the copy, which is the version the build uses. Artwork under
// src/assets (diagrams, photos) is outside the check.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const copy = join(root, "src/styles/brand.css");
const source = resolve(root, "../burningsuit-brand/brand.css");
const problems = [];

const brand = readFileSync(copy, "utf8");
if (existsSync(source) && readFileSync(source, "utf8") !== brand) {
  problems.push("src/styles/brand.css differs from ../burningsuit-brand/brand.css: copy the brand file across");
}

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
const norm = (hex) => {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};
// Only declared values count; a colour mentioned in a comment is not a token.
const values = [...brand.matchAll(/^\s*--[a-z0-9-]+:\s*([^;]+);/gm)].map((m) => m[1]);
const colours = new Set(values.flatMap((v) => [...v.matchAll(HEX)].map((m) => norm(m[0]))));

// Blank out comments but keep line breaks, so reported line numbers stay true.
const blank = (text) => text.replace(/[^\n]/g, " ");
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(^|\s)\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));

const SCAN = new Set([".css", ".astro", ".ts", ".mjs", ".mdx"]);
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return path === join(root, "src/assets") ? [] : walk(path);
    return SCAN.has(extname(name)) && path !== copy ? [path] : [];
  });

for (const file of walk(join(root, "src"))) {
  stripComments(readFileSync(file, "utf8"))
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(HEX)) {
        if (!colours.has(norm(m[0]))) {
          problems.push(`${relative(root, file)}:${i + 1}  ${m[0]} is not a brand.css colour`);
        }
      }
    });
}

if (problems.length) {
  console.error(`Brand check failed:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`Brand check passed (${colours.size} brand colours).`);
