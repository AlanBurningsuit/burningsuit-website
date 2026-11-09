// Brand check: src/styles/brand.css is a copy of ../burningsuit-brand/brand.css,
// and no source file writes a colour (hex or rgb()/hsl()/oklch()-style) that brand.css doesn't define.
//
// The sibling comparison runs only where the brand checkout exists (locally);
// CI has just the copy, which is the version the build uses. Artwork under
// src/assets (diagrams, photos) is outside the check.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { brandRoot } from "./brand-path.mjs";

const root = process.cwd();
const copy = join(root, "src/styles/brand.css");
const source = join(brandRoot, "brand.css");
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
// Functional colour literals: rgb(), hsl(), oklch() and the rest, with literal arguments only (a var() inside makes it a token use).
const FUNC = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\d[^()]*\)/gi;
const normFunc = (text) =>
  text.toLowerCase().replace(/\s+/g, " ").replace(/\s*([(),/])\s*/g, (_, mark) => mark).replace(/(^|[\s(,/])0\./g, (_, lead) => `${lead}.`).replace(/^rgba\(/, "rgb(").replace(/^hsla\(/, "hsl(");
// Only declared values count; a colour mentioned in a comment is not a token.
const values = [...brand.matchAll(/^\s*--[a-z0-9-]+:\s*([^;]+);/gm)].map((m) => m[1]);
const colours = new Set(values.flatMap((v) => [...v.matchAll(HEX)].map((m) => norm(m[0]))));
const functionColours = new Set(values.flatMap((v) => [...v.matchAll(FUNC)].map((m) => normFunc(m[0]))));
// Functional colours that predate this check and aren't brand.css tokens: allowed by file and exact literal, so the
// exception cannot spread. Known, left for a styling change to move into brand.css (or tokens) rather than fixed here.
const KNOWN_FUNCTION_COLOURS = new Set([
  "src/styles/tokens.css rgb(0 0 0/.85)", // --sheet-shadow, the daylight sheet's shadow on the dark
  "src/styles/app.css rgb(0 0 0/.7)", // the Training menu's drop shadow
]);

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
      for (const m of line.matchAll(FUNC)) {
        const value = normFunc(m[0]);
        const path = relative(root, file).split(sep).join("/");
        if (!functionColours.has(value) && !KNOWN_FUNCTION_COLOURS.has(`${path} ${value}`)) {
          problems.push(`${path}:${i + 1}  ${m[0]} is not a brand.css colour`);
        }
      }
    });
}

if (problems.length) {
  console.error(`Brand check failed:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`Brand check passed (${colours.size + functionColours.size} brand colours).`);
