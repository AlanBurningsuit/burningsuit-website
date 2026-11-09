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
  ["diagrams/export.mjs", "c16da96804771039cf3eb58b81f9316c1332deb9bad5a54e7daa703cffd4632e"],
  ["src/content/writing/we-are-all-middle-management-now.mdx", "9ab89dbad1cee004a104395a5790b47700586fa4fa5e688d5aae8d6705a6b318"],
]);
const ESSAY_ROUTE = "writing/we-are-all-middle-management-now/index.html";
const ESSAY_PARAGRAPH = "bf5b4ff4e61c4ee58d549bade0a19700e8463a08b2d97d7370d02746e4defd93";
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
    // Ignore inherited repository variables (git sets them for hooks), so -C root decides which repository is listed.
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_PREFIX"].includes(name)));
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env });
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

// One whole amount token (a currency symbol, digits, separators and any decimals), so an approved value cannot hide a longer one.
const AMOUNT = /[£€$]\p{White_Space}*\p{Nd}+(?:,\p{Nd}+)*(?:\.\p{Nd}+)?/gu;
/** The text with each amount token that exactly equals an approved value blanked out; any amount left is unapproved. */
const withoutApproved = (text, approved) => {
  const allowed = new Set(approved);
  return text.replace(AMOUNT, (token) => (allowed.has(token.replace(/\p{White_Space}+/gu, "")) ? " " : token));
};

const routeFile = (route) => join(root, "dist", route, "index.html");
const ROUTES = { home: "", training: "training", agents: "training/power-bi-with-ai-agents-101", fundamentals: "training/power-bi-fundamentals", daxDeepDive: "training/dax-deep-dive", daxFundamentals: "training/dax-fundamentals", consultancy: "power-bi" };
const count = (text, needle) => text.split(needle).length - 1;
// The private file's courses whose rates each priced route shows (see trainingPriceCopy); any other amount there fails.
const ROUTE_COURSES = {
  home: ["power-bi-fundamentals", "agentic-development-for-power-bi"],
  training: ["power-bi-fundamentals", "dax-fundamentals", "dax-deep-dive", "agentic-development-for-power-bi"],
  agents: ["agentic-development-for-power-bi"], fundamentals: ["power-bi-fundamentals"], daxDeepDive: ["dax-deep-dive"],
  daxFundamentals: ["dax-fundamentals"], consultancy: ["consultancy"],
};
/** The approved values for one priced route's file, with and without thousands separators, held in memory only. */
function routeValues(path) {
  const name = Object.keys(ROUTES).find((key) => posix(join(ROUTES[key], "index.html")) === path);
  try {
    const data = JSON.parse(readFileSync(join(root, PRICES_FILE), "utf8"));
    const values = PRICE_SLOTS.filter(([course]) => ROUTE_COURSES[name].includes(course)).map(([course, key]) => data?.[course]?.[key]).filter((value) => typeof value === "string" && value.length > 1);
    return values.flatMap((value) => [value, value.replaceAll(",", "")]);
  } catch {
    return [];
  }
}

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
    // A priced route may show its own approved slot values and nothing else: every other amount, including another route's rate, fails.
    if (inScope && MONETARY.test(withoutApproved(decoded, routeValues(path)))) fail("unapproved-amount", `dist/${path}`);
  }
  if (!priced) return;

  // Priced build: every priced route renders every approved slot from the private file, and the unpriced phrase survives only where it belongs.
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
  const home = page(ROUTES.home), training = page(ROUTES.training), agents = page(ROUTES.agents), fundamentals = page(ROUTES.fundamentals), daxDeepDive = page(ROUTES.daxDeepDive), daxFundamentals = page(ROUTES.daxFundamentals), consultancy = page(ROUTES.consultancy);
  const expect = (ok, rule, path) => { if (!ok) fail(rule, path); };

  expect(has(home, copy.homeFundamentals) && has(home, copy.publicSeat), "priced-slot-missing", "dist/index.html");
  expect(has(training, copy.trainingFundamentals) && has(training, copy.publicSeat) && has(training, copy.trainingIntro), "priced-slot-missing", "dist/training/index.html");
  for (const text of Object.values(copy.specialists)) expect(has(training, text), "priced-slot-missing", "dist/training/index.html");
  expect(has(consultancy, copy.consultancyRange), "priced-slot-missing", "dist/power-bi/index.html");
  expect(copy.seatFacts.every((text) => has(agents, text)) && agents.includes(copy.seatBookFacts), "priced-slot-missing", "dist/training/power-bi-with-ai-agents-101/index.html");
  expect(has(fundamentals, copy.fundamentalsDetail), "priced-slot-missing", "dist/training/power-bi-fundamentals/index.html");
  expect(has(daxDeepDive, copy.daxDeepDiveDetail), "priced-slot-missing", "dist/training/dax-deep-dive/index.html");
  expect(has(daxFundamentals, copy.daxFundamentalsDetail), "priced-slot-missing", "dist/training/dax-fundamentals/index.html");
  // Price on request stays for the private 101 (Home, Training, as "Private for your team: price on request") and coaching (Training) only; "On site or online" is omitted from priced output.
  expect(count(home, ">Private for your team: price on request<") === 1 && !home.includes(">Price on request<") && !home.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/index.html");
  expect(count(training, ">Private for your team: price on request<") === 1 && count(training, ">Price on request<") === 1 && !training.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/index.html");
  expect(!agents.includes("Price on request"), "unpriced-phrase-in-priced-slot", "dist/training/power-bi-with-ai-agents-101/index.html");
  expect(!fundamentals.includes("Price on request") && !fundamentals.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/power-bi-fundamentals/index.html");
  expect(!daxDeepDive.includes("Price on request") && !daxDeepDive.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/dax-deep-dive/index.html");
  expect(!daxFundamentals.includes("Price on request") && !daxFundamentals.includes(">On site or online<"), "unpriced-phrase-in-priced-slot", "dist/training/dax-fundamentals/index.html");
  expect(!consultancy.includes("Price on request"), "unpriced-phrase-in-priced-slot", "dist/power-bi/index.html");
}

if (distMode) checkDist(); else checkTracked();

if (failures.length) {
  for (const line of failures) console.error(`check:prices ${line}`);
  console.error(`check:prices failed: ${failures.length} finding${failures.length === 1 ? "" : "s"}. Values are never printed.`);
  process.exit(1);
}
console.log(distMode ? `check:prices passed for the ${pricesRequested() ? "priced" : "unpriced"} build.` : "check:prices passed: no tracked monetary literals, price assignments or private files.");
