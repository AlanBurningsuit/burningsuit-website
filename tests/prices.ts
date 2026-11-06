import { type Locator, type Page } from "@playwright/test";
import { expect } from "./analytics";
import { loadTrainingPrices, trainingPriceCopy, pricesRequested, PRICE_SLOTS, PRICES_FILE } from "../src/lib/training-prices.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The build under test is priced when the run sets SHOW_TRAINING_PRICES=true, exactly as the build did.
// Expected wording is composed from the private file at run time. Every price-bearing check below compares in memory and
// asserts a boolean with a fixed message, so a failure can never print an amount (Playwright prints expected and received values).
export const priced = pricesRequested();
export const copy = trainingPriceCopy(loadTrainingPrices());

/** The ten stored rate strings, or none for the unpriced variant. Held in memory only. */
export const privateValues: string[] = priced
  ? PRICE_SLOTS.map(([course, key]) => JSON.parse(readFileSync(resolve(process.cwd(), PRICES_FILE), "utf8"))[course][key] as string)
  : [];

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** Item texts equal the expected list, compared in memory. */
export async function expectItems(items: Locator, expected: string[], label: string) {
  const actual = (await items.allInnerTexts()).map(squash);
  expect(actual.length === expected.length && actual.every((text, index) => text === expected[index]), `${label}: items match the approved copy`).toBe(true);
}

/** One element's text equals the expected text, compared in memory. */
export async function expectText(locator: Locator, expected: string, label: string) {
  expect(squash(await locator.innerText()) === expected, `${label}: text matches the approved copy`).toBe(true);
}

/** An attribute (meta description) equals the expected text, compared in memory. */
export async function expectAttribute(locator: Locator, name: string, expected: string, label: string) {
  expect((await locator.getAttribute(name)) === expected, `${label}: ${name} matches the approved copy`).toBe(true);
}

const AMOUNT = /[£€$]\s*\d[\d,]*(?:\.\d+)?/g;

/** Unpriced pages show no amount; priced pages show only amounts held in the private file. */
export async function expectAmountsOnlyWhenPriced(page: Page, label: string) {
  const amounts = (await page.locator("body").innerText()).match(AMOUNT) ?? [];
  const ok = priced ? amounts.every((amount) => privateValues.includes(amount.replace(/\s+/g, ""))) : amounts.length === 0;
  expect(ok, `${label}: ${priced ? "only the private rates appear" : "no amount appears"}`).toBe(true);
}

/** Text content matches none of the given patterns, without printing it. */
export function expectNone(text: string, patterns: RegExp[], label: string) {
  expect(patterns.every((pattern) => !pattern.test(text)), `${label}: none of the excluded wording appears`).toBe(true);
}

export const priceOnRequest = "Price on request";

/** Private rates when the private file is present locally, whatever the variant. In-memory leak checks only. */
export const knownValues: string[] = (() => {
  try {
    const data = JSON.parse(readFileSync(resolve(process.cwd(), PRICES_FILE), "utf8"));
    return PRICE_SLOTS.map(([course, key]) => data?.[course]?.[key]).filter((value): value is string => typeof value === "string" && value.length > 1);
  } catch {
    return [];
  }
})();

/** An ARIA snapshot of a list that must hold no amount: if one is present the check fails first, with a fixed message, before any snapshot diff could print it. */
export async function expectAriaWithoutAmounts(locator: Locator, template: string) {
  const text = await locator.innerText();
  expect(!/[£€$]\s*\d/.test(text), "unpriced structure holds no amount").toBe(true);
  await expect(locator).toMatchAriaSnapshot(template);
}
