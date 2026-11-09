// The 101's course run (src/config/course-run.mjs): its derivations, and that a full or past run offers no booking.
// The committed status is never changed here: non-open runs are built from the committed one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COURSE_RUN, courseRun, longDate, seatAction, staleRunProblem, RUN_STATUS_WORDING } from "../src/config/course-run.mjs";
import { SEAT_BOOKING_URL } from "../src/config/booking.mjs";

const withRun = (changes) => courseRun({ ...COURSE_RUN, ...changes });
const sample = { start: "2027-01-20T09:30:00+00:00", end: "2027-01-20T12:30:00+00:00", minimumNumbersDate: "2027-01-08" };

test("a run's printed date, times, refund deadline and minimum-numbers date are derived as the pages print them", () => {
  const run = withRun({ ...sample, status: "open" });
  assert.equal(run.date, "2027-01-20");
  assert.equal(run.longDate, "Wednesday 20 January 2027");
  assert.equal(run.times, "9:30am to 12:30pm UK time");
  assert.equal(run.people, `${COURSE_RUN.minPeople} to ${COURSE_RUN.maxPeople} people`);
  assert.deepEqual({ ...run.refundBy }, { date: "2027-01-06", long: "Wednesday 6 January 2027" });
  assert.deepEqual({ ...run.minimumBy }, { date: "2027-01-08", long: "Friday 8 January 2027" });
  assert.deepEqual({ ...run.schemaRun }, { startDate: sample.start, endDate: sample.end });
  assert.equal(run.statusLine, null);
});

test("a summer run keeps its local date and times, and the refund deadline crosses a month", () => {
  const run = withRun({ start: "2027-07-01T14:00:00+01:00", end: "2027-07-01T17:00:00+01:00", minimumNumbersDate: "2027-06-18" });
  assert.equal(run.longDate, "Thursday 1 July 2027");
  assert.equal(run.times, "2:00pm to 5:00pm UK time");
  assert.equal(run.refundBy.long, "Thursday 17 June 2027");
  assert.equal(longDate("2028-02-29"), "Tuesday 29 February 2028");
});

test("a malformed run fails with a fixed message", () => {
  for (const changes of [
    { status: "closed" },
    { start: "2027-01-20T09:30:00Z" },
    { end: "2027-01-21T12:30:00+00:00" },
    { end: "2027-01-20T09:00:00+00:00" },
    { minimumNumbersDate: "2027-01-20" },
    { minPeople: 9 },
    { mode: "onsite" },
  ]) assert.throws(() => withRun(changes), /^Error: Course run: /, JSON.stringify(changes));
});

for (const status of /** @type {const} */ (["full", "past"])) {
  test(`a ${status} run offers no booking in either variant and shows its draft status line`, () => {
    const run = withRun({ status });
    assert.equal(run.open, false);
    assert.equal(run.statusLine, RUN_STATUS_WORDING[status]);
    for (const priced of [true, false]) {
      const seat = seatAction(run, { priced });
      assert.deepEqual(seat, { kind: "closed", line: RUN_STATUS_WORDING[status], ask: RUN_STATUS_WORDING.nextRunAsk });
      assert(!JSON.stringify(seat).includes(SEAT_BOOKING_URL));
    }
    assert.equal(run.schemaRun === undefined, status === "past", "only a past run drops its dates from JSON-LD");
  });
}

test("an open run books only in the priced build", () => {
  const run = withRun({ status: "open" });
  assert.deepEqual(seatAction(run, { priced: true }), { kind: "book" });
  assert.deepEqual(seatAction(run, { priced: false }), { kind: "not-yet" });
});

test("a run still open after it ends is a release problem; a full or past one is not", () => {
  const after = Date.parse(sample.end) + 1;
  assert.match(String(staleRunProblem(withRun({ ...sample, status: "open" }), after)), /still "open" but has ended/);
  assert.equal(staleRunProblem(withRun({ ...sample, status: "open" }), Date.parse(sample.start)), null);
  for (const status of ["full", "past"]) assert.equal(staleRunProblem(withRun({ ...sample, status }), after), null);
});
