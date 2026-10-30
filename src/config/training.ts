/**
 * The training catalogue: one source for the course facts that the training
 * page, the 101's page and the homepage all show, so names, lengths and
 * formats can't drift. Titles follow the brand lexicon (sentence case).
 *
 * Prices are deliberately NOT in this file. This repository is public, so the
 * figures live in the private ops repository (`design/copy/training-prices.json`,
 * through the gitignored `design/` junction). They render only when BOTH:
 *   - the build sets SHOW_TRAINING_PRICES=true,
 *   - and that private file is present.
 * CI and Netlify have neither, so they always build the price-on-request
 * variant, and so does the live deploy (it builds in CI). Content is chosen at
 * build time, never rendered then hidden.
 *
 * The private file maps a course id to its display price, e.g.
 *   { "power-bi-fundamentals": "£X,XXX" }
 * A course with no entry falls back to the on-request wording.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SHOW_TRAINING_PRICES = process.env.SHOW_TRAINING_PRICES === "true";

export type CourseGroup = "agentic" | "power-bi" | "ai-at-work";

export interface Course {
  /** Stable in-page anchor on /training/ and the price-file key. */
  id: string;
  title: string;
  group: CourseGroup;
  /** Length as shown, e.g. "2 days". */
  length: string;
  /** Who it's for, in one short phrase, in the reader's words. */
  audience: string;
  /** What to have done first, when it matters. */
  before?: string;
  /** Not yet bookable: shown as being written, with no format or price. */
  inDevelopment?: boolean;
}

export const COURSES: readonly Course[] = [
  { id: "agentic-101", title: "Agentic development for Power BI 101", group: "agentic", length: "Half a day, 9:30am to 12:30pm", audience: "People who build in Power BI but don't write code" },
  { id: "agentic-hands-on", title: "Agentic Power BI: a hands-on day", group: "agentic", length: "1 day", audience: "People who've done the 101", inDevelopment: true },
  { id: "modelling-for-agents", title: "Modelling for agents", group: "agentic", length: "To be confirmed", audience: "People building models that agents will work on", inDevelopment: true },
  { id: "power-bi-fundamentals", title: "Power BI fundamentals", group: "power-bi", length: "2 days", audience: "Anyone new to Power BI", before: "Nothing" },
  { id: "dax-fundamentals", title: "DAX fundamentals", group: "power-bi", length: "1 day", audience: "People who build reports and want a proper first day of DAX", before: "Power BI fundamentals, or similar experience" },
  { id: "dax-deep-dive", title: "DAX deep dive", group: "power-bi", length: "2 days", audience: "People who build reports and want DAX they understand rather than copy", before: "Power BI fundamentals, or similar experience" },
  { id: "data-modelling", title: "Data modelling", group: "power-bi", length: "1 day", audience: "People who build their own models", before: "Power BI fundamentals, or similar experience" },
  { id: "claude-day-job", title: "Claude in your day job", group: "ai-at-work", length: "1 day", audience: "Any role, with no technical background needed" },
  { id: "claude-consultants", title: "Claude for consultants", group: "ai-at-work", length: "1 day", audience: "Consultants and advanced users of AI tools, with no coding background needed" },
] as const;

export const coursesIn = (group: CourseGroup) => COURSES.filter((c) => c.group === group);
export const course = (id: string) => {
  const found = COURSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown course id: ${id}`);
  return found;
};

/**
 * The 101's first public run, a pilot at a founding rate (Alan, 29 Oct 2026):
 * a morning in the week of 18 January, 4 to 8 seats, go/no-go on 8 January,
 * and under 4 paid seats it moves once to February. The exact day and whether
 * it runs online or in person aren't decided; while they're undefined the
 * pages say they'll be confirmed, never a guess.
 */
export interface Pilot {
  week: string;
  time: string;
  minSeats: number;
  maxSeats: number;
  goNoGo: string;
  movesTo: string;
  /** The day itself, e.g. "Tuesday 19 January 2027". */
  day?: string;
  /** "online" or "in person". */
  format?: string;
}

export const PILOT_101: Pilot = {
  week: "the week of 18 January 2027",
  time: "9:30am to 12:30pm",
  minSeats: 4,
  maxSeats: 8,
  goNoGo: "8 January 2027",
  movesTo: "February",
};

function loadPrices(): Record<string, string> {
  if (!SHOW_TRAINING_PRICES) return {};
  const file = resolve(process.cwd(), "design/copy/training-prices.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
}

const PRICES = loadPrices();

/** The display price for a course, or undefined when prices aren't shown. */
export const priceFor = (id: string): string | undefined => PRICES[id];

/** True when this build shows any training price at all. */
export const showsPrices = Object.keys(PRICES).length > 0;
