// Training prices belong in the private prices file and the priced production build only.
//
//   node scripts/check-prices.mjs [root]          tracked-file scan: no monetary literals, price assignments or private files
//   node scripts/check-prices.mjs --dist [root]   built-output scan, for the variant selected by SHOW_TRAINING_PRICES
//
// Diagnostics name a rule and a path, never the matched text or any price. Exact private values are compared in memory only.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { PRICE_SLOTS, PRICES_FILE, pricesRequested, loadTrainingPrices, trainingPriceCopy, TrainingPricesError } from "../src/lib/training-prices.mjs";
import { priceScanText } from "./price-text.mjs";

const args = process.argv.slice(2);
const distMode = args.includes("--dist");
const root = args.find((arg) => !arg.startsWith("--")) ?? ".";

const failures = [];
const fail = (rule, path) => failures.push(`${rule}  ${path}`);

// A currency symbol before a number, or a number before a currency word. Money in prose or code, however small.
const MONETARY = /[£€$]\p{White_Space}*\p{Nd}|\p{Nd}\p{White_Space}*(?:GBP|pounds|quid)\b|\bGBP\p{White_Space}*\p{Nd}/iu;
// A price-like name assigned a number, with or without quotes or a currency symbol.
const ASSIGNMENT = /\b(?:price|prices|rate|rates|fee|fees|cost|costs|seatFoundingRate|onSite|online|seat)["']?\s*[:=]\s*["'`]?\s?[£€$]?\s?\p{Nd}/iu;
// Existing approved public text and vendor code that legitimately hold a currency-like token. Exact private values are still checked everywhere.
// Pin existing exceptions to reviewed bytes: editing an exempt file must never create a blind spot for a new price.
const digest = (text) => createHash("sha256").update(text).digest("hex");
const LITERAL_EXEMPT = new Map([
  ["tests/fixtures/umami/script.js", "78ea25421c1a446d5ba1c154e5e14d5c5f4cc433b27869e73ab3ebf902c5b317"],
  ["diagrams/export.mjs", "6943fa8dc7671b46d1c0a1bff09203c60da3764837026dd76f3b710d92431315"],
  ["content/writing/we-are-all-middle-management-now.mdx", "e5bca96a5509ad026df83f2a311502ede1eacc178faeba635a0382770a27c1a1"],
  ["src/content/writing/we-are-all-middle-management-now.mdx", "676a483b1676c67466a960360e4b1960144004e40844b142ebca0f1388f56621"],
]);
const ESSAY_ROUTE = "writing/we-are-all-middle-management-now/index.html";
const ESSAY_PARAGRAPH = "74a9b533e32676322c3c24fde0f6f6cdb972fe117354858d465721cd3fc20ffc";
const scanText = (path, text) => path === ESSAY_ROUTE
  ? text.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, (paragraph) => digest(paragraph) === ESSAY_PARAGRAPH ? "" : paragraph)
  : text;
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|woff2?|ttf|otf|mp4|webm|zip)$/i;
const PRIVATE_PATH = /(?:^|\/)(?:design\/|training-prices[^/]*\.json$|\.env(?:\.|$))/i;

const posix = (path) => path.split(sep).join("/");
const isText = (buffer) => !buffer.subarray(0, 8000).includes(0);
const read = (path) => { try { const buffer = readFileSync(path); return isText(buffer) ? buffer.toString("utf8") : null; } catch { return null; } };

function walk(directory, base = directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, base));
    else if (entry.isFile()) files.push(posix(relative(base, full)));
  }
  return files;
}

/** Tracked files when the root is a git checkout, otherwise every file under it. */
function trackedFiles() {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\0").filter(Boolean);
  } catch {
    return walk(root);
  }
}

/** Every private value with and without its thousands separators, held in memory only. Empty when the file is absent or unusable. */
function privateValues() {
  const file = join(root, PRICES_FILE);
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    const values = PRICE_SLOTS.map(([course, key]) => data?.[course]?.[key]).filter((value) => typeof value === "string" && value.length > 1);
    return [...new Set(values.flatMap((value) => [value, value.replaceAll(",", "")]))];
  } catch {
    return [];
  }
}

function checkTracked() {
  const values = privateValues();
  for (const path of trackedFiles()) {
    if (PRIVATE_PATH.test(path)) fail("private-file-tracked", path);
    if (BINARY.test(path)) continue;
    const text = read(join(root, path));
    if (text === null) continue;
    const decoded = priceScanText(text);
    if (values.some((value) => decoded.includes(value))) fail("private-value", path);
    if (LITERAL_EXEMPT.get(path) !== digest(text)) {
      if (MONETARY.test(decoded)) fail("monetary-literal", path);
      if (ASSIGNMENT.test(decoded)) fail("price-assignment", path);
    }
  }
}

const routeFile = (route) => join(root, "dist", route, "index.html");
const ROUTES = { home: "", training: "training", agents: "training/agentic-development-for-power-bi", fundamentals: "training/power-bi-fundamentals" };
const count = (text, needle) => text.split(needle).length - 1;

function checkDist() {
  const dist = join(root, "dist");
  if (!existsSync(dist)) { fail("dist-missing", "dist"); return; }
  const files = walk(dist);
  const values = privateValues();
  const priced = pricesRequested();
  const routePaths = new Set(Object.values(ROUTES).map((route) => posix(join(route, "index.html"))));

  for (const path of files) {
    if (BINARY.test(path)) continue;
    const text = read(join(dist, path));
    if (text === null) continue;
    const decoded = priceScanText(text);
    const inScope = priced && routePaths.has(path);
    if (!inScope && values.some((value) => decoded.includes(value))) fail("price-outside-scope", `dist/${path}`);
    if (!inScope && path.endsWith(".html")) {
      if (MONETARY.test(priceScanText(scanText(path, text)))) fail("monetary-literal", `dist/${path}`);
      if (/\bex VAT\b|founding rate/i.test(decoded)) fail("price-wording-outside-scope", `dist/${path}`);
    }
  }
  if (!priced) return;

  // Priced build: all four routes render every approved slot from the private file, and the unpriced phrase survives only where it belongs.
  let copy;
  try {
    const prices = loadTrainingPrices({ env: { SHOW_TRAINING_PRICES: "true" }, file: join(root, PRICES_FILE) });
    copy = trainingPriceCopy(prices);
  } catch (error) {
    fail(error instanceof TrainingPricesError ? `prices-${error.code}` : "prices-unreadable", PRICES_FILE);
    return;
  }
  const page = (route) => (existsSync(routeFile(route)) ? readFileSync(routeFile(route), "utf8") : "");
  const has = (html, text) => html.includes(`>${text}<`);
  const home = page(ROUTES.home), training = page(ROUTES.training), agents = page(ROUTES.agents), fundamentals = page(ROUTES.fundamentals);
  const expect = (ok, rule, path) => { if (!ok) fail(rule, path); };

  expect(has(home, copy.homeFundamentals) && has(home, copy.publicSeat), "priced-slot-missing", "dist/index.html");
  expect(has(training, copy.trainingFundamentals) && has(training, copy.publicSeat) && has(training, copy.trainingIntro), "priced-slot-missing", "dist/training/index.html");
  for (const text of Object.values(copy.specialists)) expect(has(training, text), "priced-slot-missing", "dist/training/index.html");
  expect(copy.seatFacts.every((text) => has(agents, text)) && agents.includes(copy.seatBookFacts), "priced-slot-missing", "dist/training/agentic-development-for-power-bi/index.html");
  expect(has(fundamentals, copy.fundamentalsDetail), "priced-slot-missing", "dist/training/power-bi-fundamentals/index.html");
  // Price on request stays for the private 101 (Home, Training) and coaching (Training) only; "On site or online" is omitted from priced output.
  expect(count(home, ">Price on request<") === 1 && !home.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/index.html");
  expect(count(training, ">Price on request<") === 2 && !training.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/index.html");
  expect(!agents.includes("Price on request"), "unpriced-phrase-in-priced-slot", "dist/training/agentic-development-for-power-bi/index.html");
  expect(!fundamentals.includes("Price on request") && !fundamentals.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/power-bi-fundamentals/index.html");
}

if (distMode) checkDist(); else checkTracked();

if (failures.length) {
  for (const line of failures) console.error(`check:prices ${line}`);
  console.error(`check:prices failed: ${failures.length} finding${failures.length === 1 ? "" : "s"}. Values are never printed.`);
  process.exit(1);
}
console.log(distMode ? `check:prices passed for the ${pricesRequested() ? "priced" : "unpriced"} build.` : "check:prices passed: no tracked monetary literals, price assignments or private files.");
