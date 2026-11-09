// @ts-check
/**
 * The 101's one public run. Every page that dates it (Home's and Training's cards, the 101's hero, booking band,
 * booking terms and Course JSON-LD) reads it from here, so a new date is one edit.
 *
 * Times are UK local time with their offset (+00:00 in winter, +01:00 in summer); pages print the date and times as
 * written here. `status` is "open" while seats can be booked, "full" once the Stripe link has closed (8 payments) and
 * "past" after the run. Any status but "open" removes every booking link and shows the status line below instead;
 * "past" also drops the run's dates from the JSON-LD. `npm run check:release` blocks a deploy while the run is still
 * "open" after it has ended.
 */
export const COURSE_RUN = Object.freeze({
  start: "2027-01-20T09:30:00+00:00",
  end: "2027-01-20T12:30:00+00:00",
  // The booking terms' minimum-numbers date: fewer than minPeople booked by then and the run moves once.
  minimumNumbersDate: "2027-01-08",
  minPeople: 4,
  maxPeople: 8,
  mode: "online",
  /** @type {"open" | "full" | "past"} */
  status: "open",
});

// DRAFT wording, awaiting Alan's approval before first use. Nothing renders it while the status is "open".
export const RUN_STATUS_WORDING = Object.freeze({
  full: "This run is full.",
  past: "This run has finished.",
  // Links to the 101's private-course email on its own page and to the enquiry form on Home and Training.
  nextRunAsk: "Ask about the next run",
});

const STATUSES = ["open", "full", "past"];
const REFUND_DAYS = 14;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ISO_WITH_OFFSET = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00([+-]\d{2}:\d{2})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "2027-01-20" → "Wednesday 20 January 2027" (a calendar date, read without a time zone).
 * @param {string} isoDate
 */
export function longDate(isoDate) {
  if (!ISO_DATE.test(isoDate)) throw new Error(`Course run: not a date: ${isoDate}`);
  const day = new Date(`${isoDate}T00:00:00Z`);
  return `${DAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

/**
 * The calendar date `days` before an ISO date.
 * @param {string} isoDate
 * @param {number} days
 */
function daysBefore(isoDate, days) {
  const day = new Date(`${isoDate}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

/**
 * "09:30" → "9:30am", "12:30" → "12:30pm".
 * @param {string} hours
 * @param {string} minutes
 */
function clock(hours, minutes) {
  const h = Number(hours);
  return `${h % 12 || 12}:${minutes}${h < 12 ? "am" : "pm"}`;
}

/**
 * Everything the pages print or emit about a run, derived from its config. Throws a fixed message on a malformed run.
 * @param {typeof COURSE_RUN} run
 */
export function courseRun(run = COURSE_RUN) {
  const start = run.start.match(ISO_WITH_OFFSET);
  const end = run.end.match(ISO_WITH_OFFSET);
  if (!start || !end) throw new Error("Course run: start and end must be ISO 8601 local times with an offset, to the minute.");
  if (start[1] !== end[1] || start[4] !== end[4]) throw new Error("Course run: start and end must be on the same day with the same offset.");
  if (Date.parse(run.end) <= Date.parse(run.start)) throw new Error("Course run: end must be after start.");
  if (!ISO_DATE.test(run.minimumNumbersDate) || run.minimumNumbersDate >= start[1]) throw new Error("Course run: the minimum-numbers date must be a date before the run.");
  if (!(Number.isInteger(run.minPeople) && Number.isInteger(run.maxPeople) && run.minPeople > 0 && run.minPeople <= run.maxPeople)) throw new Error("Course run: capacity must be whole numbers, minimum no more than maximum.");
  if (run.mode !== "online") throw new Error("Course run: only an online run is supported.");
  if (!STATUSES.includes(run.status)) throw new Error(`Course run: status must be one of ${STATUSES.join(", ")}.`);
  const refundBy = daysBefore(start[1], REFUND_DAYS);
  return Object.freeze({
    status: run.status,
    open: run.status === "open",
    /** The `datetime` attribute: the run's calendar date. */
    date: start[1],
    longDate: longDate(start[1]),
    times: `${clock(start[2], start[3])} to ${clock(end[2], end[3])} UK time`,
    modeText: "live online",
    people: `${run.minPeople} to ${run.maxPeople} people`,
    minPeople: run.minPeople,
    maxPeople: run.maxPeople,
    refundDays: REFUND_DAYS,
    refundBy: Object.freeze({ date: refundBy, long: longDate(refundBy) }),
    minimumBy: Object.freeze({ date: run.minimumNumbersDate, long: longDate(run.minimumNumbersDate) }),
    endsAt: Date.parse(run.end),
    /** Schema.org courseMode and the Course node's run dates; a past run has no dates to offer. */
    schemaMode: "Online",
    schemaRun: run.status === "past" ? undefined : Object.freeze({ startDate: run.start, endDate: run.end }),
    /** The draft status line (null while open) and the ask that replaces booking. */
    statusLine: run.status === "open" ? null : RUN_STATUS_WORDING[run.status],
    nextRunAsk: RUN_STATUS_WORDING.nextRunAsk,
  });
}

/**
 * What a "Book a seat" place shows: the booking link only while the run is open in the priced build; the existing
 * "not open yet" control while it is open but unpriced; otherwise the status line and the next-run ask.
 * @param {ReturnType<typeof courseRun>} run
 * @param {{ priced: boolean }} options
 * @returns {{ kind: "book" } | { kind: "not-yet" } | { kind: "closed", line: string, ask: string }}
 */
export function seatAction(run, { priced }) {
  if (!run.open) return { kind: "closed", line: /** @type {string} */ (run.statusLine), ask: run.nextRunAsk };
  return priced ? { kind: "book" } : { kind: "not-yet" };
}

/**
 * The release check's message when a run is still open after it ended, or null.
 * @param {ReturnType<typeof courseRun>} run
 * @param {number} [now]
 */
export function staleRunProblem(run, now = Date.now()) {
  return run.open && run.endsAt < now ? "the 101's course run is still \"open\" but has ended: mark it \"past\" (or move its date) in src/config/course-run.mjs" : null;
}

export const RUN = courseRun();
