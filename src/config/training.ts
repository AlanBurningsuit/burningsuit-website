/**
 * The training catalogue: one source for the course facts that the training
 * page and the homepage both show, so names, lengths and formats can't drift.
 *
 * Prices are deliberately NOT in this file. This repository is public, and no
 * training price has a recorded ruling yet, so the figures live in the private
 * ops repository (`design/copy/training-prices.json`, through the gitignored
 * `design/` junction). They render only when BOTH:
 *   - the build sets SHOW_TRAINING_PRICES=true (see `flags.showTrainingPrices`),
 *   - and that private file is present.
 * CI and Netlify have neither, so they always build the price-on-request
 * variant. Content is chosen at build time, never rendered then hidden.
 *
 * The private file maps a course id to its display price, e.g.
 *   { "power-bi-fundamentals": "£X,XXX" }
 * A course with no entry falls back to the on-request wording.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { flags } from "./flags";

export type CourseGroup = "agentic" | "power-bi" | "ai-at-work";

export interface Course {
  /** Stable in-page anchor on /training/ and the price-file key. */
  id: string;
  title: string;
  group: CourseGroup;
  /** Length as shown, e.g. "Two days". */
  length: string;
  /** Who it's for, in one short phrase. */
  audience: string;
  /** What to have done first, when it matters. */
  before?: string;
  /** Not yet bookable: shown as being written, with no format or price. */
  inDevelopment?: boolean;
}

export const COURSES: readonly Course[] = [
  { id: "agentic-101", title: "Agentic development for Power BI 101", group: "agentic", length: "Half a day, 9:30 to 12:30", audience: "Anyone who builds in Power BI and wants to hand some of the building to an AI agent" },
  { id: "agentic-hands-on", title: "Agentic Power BI: a hands-on day", group: "agentic", length: "One day", audience: "People who've done the 101", inDevelopment: true },
  { id: "modelling-for-agents", title: "Modelling for agents", group: "agentic", length: "To be confirmed", audience: "People building models that agents will work on", inDevelopment: true },
  { id: "power-bi-fundamentals", title: "Power BI Fundamentals", group: "power-bi", length: "Two days", audience: "Anyone new to Power BI", before: "Nothing" },
  { id: "dax-fundamentals", title: "DAX Fundamentals", group: "power-bi", length: "One day", audience: "Report builders who want a first day of DAX", before: "Fundamentals, or the skills check" },
  { id: "dax-deep-dive", title: "DAX Deep Dive", group: "power-bi", length: "Two days", audience: "Report builders who want DAX they understand", before: "Fundamentals, or the skills check" },
  { id: "data-modelling", title: "Data Modelling", group: "power-bi", length: "One day", audience: "Anyone building their own models", before: "Fundamentals, or the skills check" },
  { id: "claude-day-job", title: "Claude in your day job", group: "ai-at-work", length: "One day", audience: "Any role; no technical background needed" },
  { id: "claude-consultants", title: "Claude for consultants", group: "ai-at-work", length: "One day", audience: "Consultants and advanced users; no coding background assumed" },
] as const;

export const coursesIn = (group: CourseGroup) => COURSES.filter((c) => c.group === group);
export const course = (id: string) => {
  const found = COURSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown course id: ${id}`);
  return found;
};

function loadPrices(): Record<string, string> {
  if (!flags.showTrainingPrices) return {};
  const file = resolve(process.cwd(), "design/copy/training-prices.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
}

const PRICES = loadPrices();

/** The display price for a course, or undefined when prices aren't shown. */
export const priceFor = (id: string): string | undefined => PRICES[id];

/** True when this build shows any training price at all. */
export const showsPrices = Object.keys(PRICES).length > 0;
