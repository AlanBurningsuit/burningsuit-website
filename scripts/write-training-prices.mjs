// Production workflow only: writes the private prices from a GitHub Actions secret to design/copy/training-prices.json.
// The secret arrives in the environment (never on a command line), is validated without echoing it, and is written with owner-only access.
// In GitHub Actions it also registers each rate as a masked value and enables the priced build for the following steps.
import { appendFileSync, chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PRICE_SLOTS, PRICES_FILE, TrainingPricesError, validatePrices } from "../src/lib/training-prices.mjs";

const source = process.env.TRAINING_PRICES_JSON ?? "";
const refuse = (message) => {
  console.error(`write-training-prices: ${message}`);
  process.exit(1);
};
if (!source.trim()) refuse("the training prices secret is empty or unset.");

let data;
try {
  data = JSON.parse(source);
} catch {
  refuse("the training prices secret is not valid JSON.");
}
let values;
try {
  values = validatePrices(data);
} catch (error) {
  refuse(error instanceof TrainingPricesError ? error.message : "the training prices secret could not be validated.");
}

if (process.env.GITHUB_ACTIONS === "true") {
  // Structured secrets are not masked per value by GitHub; do it here before anything else can run.
  for (const value of new Set(values.flatMap((item) => [item, item.replaceAll(",", "")]))) console.log(`::add-mask::${value}`);
}

const file = resolve(process.cwd(), PRICES_FILE);
mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
// Keep only the ten expected rates, whatever else the secret held.
const clean = {};
for (const [course, key] of PRICE_SLOTS) (clean[course] ??= {})[key] = data[course][key];
writeFileSync(file, `${JSON.stringify(clean, null, 2)}\n`, { mode: 0o600 });
chmodSync(file, 0o600);

if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, "SHOW_TRAINING_PRICES=true\n");
console.log("write-training-prices: the private training prices are in place for this build.");
