// Checks the built site's prices against the tracked prices file (src/config/training-prices.json).
//
//   node scripts/check-prices.mjs [root]   root holds dist/ and the prices file; defaults to the current directory
//
// Every amount in built HTML and text must be a tracked rate (so a typo or a stray figure fails), every tracked rate must
// render somewhere, and coaching and the private 101 must still say price on request.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { decodeHTML } from "entities";
import { PRICES_FILE, loadTrainingPrices, TrainingPricesError } from "../src/lib/training-prices.mjs";

const root = process.argv[2] ?? ".";
const dist = join(root, "dist");
const failures = [];
const fail = (rule, path) => failures.push(`${rule}  ${path}`);

// An amount: a currency symbol, digits, separators and any decimals, or digits before a currency word.
const AMOUNT = /[£€$]\s*\d+(?:,\d{3})*(?:\.\d+)?(?!\d)|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:GBP|pounds|quid)\b/giu;
// Amounts that are not prices, by built path. The essay's figure is part of an argument, not an offer.
const OTHER_AMOUNTS = new Map([["writing/we-are-all-middle-management-now/index.html", ["£50"]]]);

const posix = (path) => path.split(sep).join("/");
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [posix(relative(dist, full))] : [];
  });
}

function check() {
  let rates;
  try {
    rates = Object.values(loadTrainingPrices({ file: join(root, PRICES_FILE) })).flatMap((pair) => Object.values(pair));
  } catch (error) {
    fail(error instanceof TrainingPricesError ? `prices-${error.code}` : "prices-unreadable", PRICES_FILE);
    return;
  }
  if (!existsSync(dist)) { fail("dist-missing", "dist"); return; }
  const unseen = new Set(rates);
  const pages = new Map();
  for (const path of walk(dist).filter((file) => /\.(?:html|txt|xml)$/.test(file))) {
    const text = decodeHTML(readFileSync(join(dist, path), "utf8"));
    pages.set(path, text);
    const allowed = new Set([...rates, ...(OTHER_AMOUNTS.get(path) ?? [])]);
    for (const [token] of text.matchAll(AMOUNT)) {
      const amount = token.replace(/\s+/g, "");
      if (!allowed.has(amount)) fail(`unknown-amount ${amount}`, `dist/${path}`);
      unseen.delete(amount);
    }
  }
  for (const rate of unseen) fail(`rate-not-shown ${rate}`, PRICES_FILE);

  const count = (path, needle) => (pages.get(path) ?? "").split(needle).length - 1;
  // Coaching (Training) and the private 101 (Home and Training) have no rates: they say price on request.
  if (count("training/index.html", ">Price on request<") !== 1) fail("coaching-not-on-request", "dist/training/index.html");
  for (const path of ["index.html", "training/index.html"]) {
    if (count(path, ">Private for your team: price on request<") !== 1) fail("private-101-not-on-request", `dist/${path}`);
  }
}

check();
if (failures.length) {
  for (const line of failures) console.error(`check:prices ${line}`);
  console.error(`check:prices failed: ${failures.length} finding${failures.length === 1 ? "" : "s"}.`);
  process.exit(1);
}
console.log("check:prices passed: every built amount is a tracked rate, and coaching and the private 101 are on request.");
