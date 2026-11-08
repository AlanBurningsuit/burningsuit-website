// Training prices: the one place that reads the private prices file and composes price wording.
//
// Prices are shown only when SHOW_TRAINING_PRICES is exactly "true". Otherwise the file is never read, even if it exists,
// and every page keeps "Price on request". Requested but missing, unreadable, malformed or incomplete input stops the build
// with a fixed message: it never falls back to "Price on request" and never repeats anything it read.
// This file holds no amounts; the figures live only in the private design/copy/training-prices.json.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Private source, relative to the project root. Gitignored through design/; never tracked. */
export const PRICES_FILE = "design/copy/training-prices.json";
export const PRICES_FLAG = "SHOW_TRAINING_PRICES";

/** Private file keys for the rate slots. */
export const PRICE_SLOTS = [
  ["power-bi-fundamentals", "onSite"], ["power-bi-fundamentals", "online"],
  ["dax-fundamentals", "onSite"], ["dax-fundamentals", "online"],
  ["dax-deep-dive", "onSite"], ["dax-deep-dive", "online"],
  ["agentic-development-for-power-bi", "seatFoundingRate"], ["agentic-development-for-power-bi", "seat"],
  ["coaching", "from"], ["coaching", "to"],
  ["consultancy", "from"], ["consultancy", "to"],
];

/** A pound sign then digits and commas only: no VAT text, no spaces, no ranges. */
export const PRICE_FORMAT = /^£(?:\d+|\d{1,3}(?:,\d{3})+)$/;

// Fixed text only. Never add the offending value, key contents or parser output to these.
const MESSAGES = {
  missing: "Training prices were requested but the private prices file is missing or unreadable.",
  invalid: "Training prices were requested but the private prices file is not valid JSON.",
  incomplete: "Training prices were requested but the private prices file is missing a required rate.",
  format: "Training prices were requested but a rate in the private prices file is not in the expected format.",
};

export class TrainingPricesError extends Error {
  /** @param {keyof typeof MESSAGES} code */
  constructor(code) {
    super(MESSAGES[code]);
    this.name = "TrainingPricesError";
    this.code = code;
  }
}

/** True only for the exact string "true". */
export const pricesRequested = (env = process.env) => env[PRICES_FLAG] === "true";

/** Every stored rate string in file order, for in-memory comparisons only. Validates the shape first. */
export function validatePrices(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new TrainingPricesError("incomplete");
  const values = [];
  for (const [course, key] of PRICE_SLOTS) {
    const group = data[course];
    if (!group || typeof group !== "object" || Array.isArray(group) || typeof group[key] !== "string" || group[key] === "") {
      throw new TrainingPricesError("incomplete");
    }
    values.push(group[key]);
  }
  if (!values.every((value) => PRICE_FORMAT.test(value))) throw new TrainingPricesError("format");
  return values;
}

/**
 * Returns null unless prices are requested. When requested, returns the validated rates or throws a TrainingPricesError.
 * @param {{ env?: Record<string, string | undefined>, file?: string }} [options]
 */
export function loadTrainingPrices({ env = process.env, file = resolve(process.cwd(), PRICES_FILE) } = {}) {
  if (!pricesRequested(env)) return null;
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
    coaching: pair("coaching", "from", "to"),
    consultancy: pair("consultancy", "from", "to"),
  });
}

const rate = ({ onSite, online }) => `${onSite} on site or ${online} online`;

/**
 * Approved price wording (ops site/training-prices-amendment-copy-2026-11-06.md), filled from the validated rates.
 * Returns null for the unpriced variant, where every page keeps its baseline words.
 */
export function trainingPriceCopy(prices) {
  if (!prices) return null;
  const { founding, standard } = { founding: prices.agent101.seatFoundingRate, standard: prices.agent101.seat };
  return Object.freeze({
    // Home (H1, H2) and Training (T2, T3)
    homeFundamentals: `${rate(prices.fundamentals)}, per booking for up to 8 people, ex VAT, UK travel included`,
    publicSeat: `${founding} a seat, the founding rate for this first run. Standard rate ${standard} a seat. Ex VAT.`,
    trainingFundamentals: `${rate(prices.fundamentals)}, ex VAT`,
    trainingIntro: "Private course prices are per booking, for up to 8 people, and include UK travel.",
    specialists: Object.freeze({
      "DAX fundamentals": `${rate(prices.daxFundamentals)}, ex VAT`,
      "DAX deep dive": `${rate(prices.daxDeepDive)}, ex VAT`,
    }),
    // 101 page (A1, A2)
    seatFacts: Object.freeze([
      `${founding} a seat, the founding rate for this first run, ex VAT`,
      `${standard} a seat, the standard rate, ex VAT`,
    ]),
    seatBookFacts: `${founding} a seat, the founding rate for this first run, ex VAT. ${standard} a seat, the standard rate, ex VAT.`,
    // Fundamentals page (F1)
    fundamentalsDetail: `${rate(prices.fundamentals)}, per booking, ex VAT, UK travel included`,
    // DAX deep dive page (ops site/dax-deep-dive-page-copy.md, the Fundamentals pattern)
    daxDeepDiveDetail: `${rate(prices.daxDeepDive)}, per booking, ex VAT, UK travel included`,
    // DAX fundamentals page (ops site/dax-fundamentals-page-copy.md, the DAX deep dive pattern)
    daxFundamentalsDetail: `${rate(prices.daxFundamentals)}, per booking, ex VAT, UK travel included`,
    // Budget guidance (Alan, 8 Nov 2026): coaching on Training, consultancy on its own page. Both depend on the work.
    coachingRange: `Usually ${prices.coaching.from} to ${prices.coaching.to}, ex VAT`,
    consultancyRange: `Usually a fixed price of ${prices.consultancy.from} to ${prices.consultancy.to}, ex VAT`,
  });
}

/** Closing sentence of the Training, Fundamentals, DAX fundamentals and DAX deep dive meta descriptions, kept only in the unpriced variant. */
export const PRICE_ON_REQUEST = "Price on request";
