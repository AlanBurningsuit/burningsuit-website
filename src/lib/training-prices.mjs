// Training prices: the one place that reads the tracked prices file and composes price wording.
//
// The rates live in src/config/training-prices.json. Missing, unreadable, malformed or incomplete data stops the build:
// it never falls back to "Price on request". Coaching and the private 101 have no rates: they stay "Price on request".
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The tracked prices file, relative to the project root. */
export const PRICES_FILE = "src/config/training-prices.json";

/** The file's keys for the rate slots. They name the file's entries, not page routes: the 101 keeps its launch key after its page moved. */
export const PRICE_SLOTS = [
  ["power-bi-fundamentals", "onSite"], ["power-bi-fundamentals", "online"],
  ["dax-fundamentals", "onSite"], ["dax-fundamentals", "online"],
  ["dax-deep-dive", "onSite"], ["dax-deep-dive", "online"],
  ["agentic-development-for-power-bi", "seatFoundingRate"], ["agentic-development-for-power-bi", "seat"],
  ["consultancy", "from"], ["consultancy", "to"],
];

/** A pound sign then digits and commas only: no VAT text, no spaces, no ranges. */
export const PRICE_FORMAT = /^£(?:\d+|\d{1,3}(?:,\d{3})+)$/;

const MESSAGES = {
  missing: `The training prices file (${PRICES_FILE}) is missing or unreadable.`,
  invalid: `The training prices file (${PRICES_FILE}) is not valid JSON.`,
  incomplete: `The training prices file (${PRICES_FILE}) is missing a required rate or holds an unknown one.`,
  format: `A rate in the training prices file (${PRICES_FILE}) is not in the expected format.`,
};

export class TrainingPricesError extends Error {
  /** @param {keyof typeof MESSAGES} code */
  constructor(code) {
    super(MESSAGES[code]);
    this.name = "TrainingPricesError";
    this.code = code;
  }
}

/** Every rate string in slot order. Throws a TrainingPricesError on a missing, extra or malformed rate. */
export function validatePrices(data) {
  const isGroup = (group) => Boolean(group) && typeof group === "object" && !Array.isArray(group);
  if (!isGroup(data)) throw new TrainingPricesError("incomplete");
  const expected = new Set(PRICE_SLOTS.map(([course, key]) => `${course}.${key}`));
  const present = Object.entries(data).flatMap(([course, group]) => (isGroup(group) ? Object.keys(group).map((key) => `${course}.${key}`) : [course]));
  if (present.length !== expected.size || !present.every((slot) => expected.has(slot))) throw new TrainingPricesError("incomplete");
  const values = PRICE_SLOTS.map(([course, key]) => data[course][key]);
  if (!values.every((value) => typeof value === "string" && PRICE_FORMAT.test(value))) throw new TrainingPricesError("format");
  return values;
}

/**
 * The validated rates, or a thrown TrainingPricesError.
 * @param {{ file?: string }} [options]
 */
export function loadTrainingPrices({ file = resolve(process.cwd(), PRICES_FILE) } = {}) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new TrainingPricesError("missing");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new TrainingPricesError("invalid");
  }
  validatePrices(data);
  const pair = (course, a, b) => Object.freeze({ [a]: data[course][a], [b]: data[course][b] });
  return Object.freeze({
    fundamentals: pair("power-bi-fundamentals", "onSite", "online"),
    daxFundamentals: pair("dax-fundamentals", "onSite", "online"),
    daxDeepDive: pair("dax-deep-dive", "onSite", "online"),
    agent101: pair("agentic-development-for-power-bi", "seatFoundingRate", "seat"),
    consultancy: pair("consultancy", "from", "to"),
  });
}

const rate = ({ onSite, online }) => `${onSite} on site or ${online} online`;

/**
 * Approved price wording (ops site/records/training-prices-amendment-copy-2026-11-06.md), filled from the validated rates.
 * @param {ReturnType<typeof loadTrainingPrices>} [prices]
 */
export function trainingPriceCopy(prices = loadTrainingPrices()) {
  const { founding, standard } = { founding: prices.agent101.seatFoundingRate, standard: prices.agent101.seat };
  return Object.freeze({
    // Home (H1, H2) and Training (T2, T3)
    homeFundamentals: `${rate(prices.fundamentals)}, per booking for up to 8 people, ex VAT, UK travel included`,
    // 101 seat wording (Alan, 8 Nov 2026): this run's price first, later runs second, and VAT added at checkout.
    publicSeat: `${founding} a seat for this first run, then ${standard} for later runs. Plus VAT at checkout.`,
    trainingFundamentals: `${rate(prices.fundamentals)}, ex VAT`,
    trainingIntro: "Private course prices are per booking, for up to 8 people, and include UK travel.",
    specialists: Object.freeze({
      "DAX fundamentals": `${rate(prices.daxFundamentals)}, ex VAT`,
      "DAX deep dive": `${rate(prices.daxDeepDive)}, ex VAT`,
    }),
    // 101 page (A1, A2)
    seatFacts: Object.freeze([
      `${founding} a seat for this first run, the founding rate`,
      `${standard} a seat for later runs`,
      "VAT is added at checkout",
    ]),
    seatBookFacts: `${founding} a seat for this first run, the founding rate. Later runs are ${standard} a seat. VAT is added at checkout.`,
    // Fundamentals page (F1)
    fundamentalsDetail: `${rate(prices.fundamentals)}, per booking, ex VAT, UK travel included`,
    // DAX deep dive page (ops site/dax-deep-dive-page-copy.md, the Fundamentals pattern)
    daxDeepDiveDetail: `${rate(prices.daxDeepDive)}, per booking, ex VAT, UK travel included`,
    // DAX fundamentals page (ops site/dax-fundamentals-page-copy.md, the DAX deep dive pattern)
    daxFundamentalsDetail: `${rate(prices.daxFundamentals)}, per booking, ex VAT, UK travel included`,
    // Budget guidance (Alan, 8 Nov 2026): consultancy only. Coaching stays on request: it's too bespoke for a band.
    consultancyRange: `Usually a fixed price of ${prices.consultancy.from} to ${prices.consultancy.to}, ex VAT`,
  });
}

/** What coaching shows in place of a price. */
export const PRICE_ON_REQUEST = "Price on request";
