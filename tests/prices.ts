import { type Page } from "@playwright/test";
import { expect } from "./analytics";
import { loadTrainingPrices, trainingPriceCopy } from "../src/lib/training-prices.mjs";

// Expected price wording is composed from the tracked prices file (src/config/training-prices.json), so a price change
// is a one-file edit and no test pins an amount.
export const prices = loadTrainingPrices();
export const copy = trainingPriceCopy(prices);
/** Every tracked rate string. */
export const rates: string[] = Object.values(prices).flatMap((pair) => Object.values(pair));

// A comma straight after an amount (as in a range followed by ", ex VAT") is punctuation, not part of the amount.
const AMOUNT = /[£€$]\s*\d+(?:,\d{3})*(?:\.\d+)?/g;

/** Every amount on the page is a tracked rate. */
export async function expectOnlyTrackedAmounts(page: Page, label: string) {
  const amounts = ((await page.locator("body").innerText()).match(AMOUNT) ?? []).map((amount) => amount.replace(/\s+/g, ""));
  expect(amounts.filter((amount) => !rates.includes(amount)), `${label}: only tracked rates appear`).toEqual([]);
}

/** Text content matches none of the given patterns. */
export function expectNone(text: string, patterns: RegExp[], label: string) {
  for (const pattern of patterns) expect(text, `${label}: excluded wording`).not.toMatch(pattern);
}

/** The 101's two "Book a seat" controls: links to the Stripe Payment Link in the same tab. */
export async function expectSeatBooking(page: Page) {
  const { SEAT_BOOKING_URL } = await import("../src/config/booking.mjs");
  const links = page.getByRole("link", { name: "Book a seat", exact: true });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", SEAT_BOOKING_URL);
    await expect(link).not.toHaveAttribute("target", /./);
  }
  await expect(page.getByRole("button", { name: "Book a seat" })).toHaveCount(0);
  await expect(page.locator(".booking-status")).toHaveCount(0);
}
