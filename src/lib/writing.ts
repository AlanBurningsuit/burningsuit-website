/* Writing entries' dates and URLs, shared by EssayLayout (the byline), the Writing index (its lists) and the two
   article routes. Each date is shown at the precision its source gives: a day, or only a month. */
import type { CollectionEntry } from "astro:content";
import { writingRoute } from "../config/writing-routes.mjs";

export { writingRoute };

type Writing = CollectionEntry<"writing">;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2022-07" → "July 2022". */
export const monthText = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
/** A UTC date → "9 April 2019". */
export const dayText = (date: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The entry's public path, with its trailing slash. */
export const writingPath = (entry: Writing) => `/${writingRoute(entry.id)}/`;

/** When the entry first appeared: the first time a talk was given, else its publication day or month. */
export function firstDate(data: Writing["data"]): string | undefined {
  const talk = data.givenAt?.map(({ date }) => isoDay(date)).sort()[0];
  return talk ?? (data.datePublished ? isoDay(data.datePublished) : data.archiveMonth);
}

/** The index's date line: "Talk, February 2026", "March 2021" or "April 2019, revised July 2022". */
export function indexDateLine(data: Writing["data"]): string | undefined {
  const first = firstDate(data);
  if (!first) return undefined;
  const month = monthText(first);
  if (data.givenAt?.length) return `Talk, ${month}`;
  return data.revisedMonth ? `${month}, revised ${monthText(data.revisedMonth)}` : month;
}

/** Newest first, by first appearance; ties keep the collection's order. */
export const newestFirst = (a: Writing, b: Writing) => (firstDate(b.data) ?? "").localeCompare(firstDate(a.data) ?? "");
