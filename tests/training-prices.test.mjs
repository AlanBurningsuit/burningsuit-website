import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { loadTrainingPrices, trainingPriceCopy, TrainingPricesError, PRICE_SLOTS, PRICES_FILE, PRICE_FORMAT, validatePrices } from "../src/lib/training-prices.mjs";

// Fixture amounts are generated from a counter, so a price change never touches this file.
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let seed = 4321;
const amount = () => `£${(seed += 1117).toLocaleString("en-GB")}`;
const fixture = () => {
  const data = {};
  for (const [course, key] of PRICE_SLOTS) (data[course] ??= {})[key] = amount();
  return data;
};
const workspace = () => mkdtempSync(join(tmpdir(), "bs-prices-"));
const writeFile = (path, data) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data)); };
const valuesOf = (data) => PRICE_SLOTS.map(([course, key]) => data[course][key]);
const thrownCode = (fn) => { try { fn(); } catch (error) { return error instanceof TrainingPricesError ? error.code : String(error); } return null; };

// ---- The tracked file and the loader -------------------------------------------------------------------------------

test("the tracked prices file holds exactly the rate slots, each a well-formed amount", () => {
  const data = JSON.parse(readFileSync(join(root, PRICES_FILE), "utf8"));
  assert.equal(validatePrices(data).length, PRICE_SLOTS.length);
  for (const value of valuesOf(data)) assert.match(value, PRICE_FORMAT);
  assert.deepEqual(Object.keys(data).sort(), [...new Set(PRICE_SLOTS.map(([course]) => course))].sort());
  assert.equal(loadTrainingPrices().fundamentals.onSite, data["power-bi-fundamentals"].onSite);
});

test("the approved wording is composed from the rates", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  const data = fixture();
  writeFile(file, data);
  const copy = trainingPriceCopy(loadTrainingPrices({ file }));
  const [fOn, fOnline, dOn, dOnline, pOn, pOnline, founding, seat, kFrom, kTo] = valuesOf(data);
  assert.equal(copy.homeFundamentals, `${fOn} on site or ${fOnline} online, per booking for up to 8 people, ex VAT, UK travel included`);
  assert.equal(copy.trainingFundamentals, `${fOn} on site or ${fOnline} online, ex VAT`);
  assert.equal(copy.fundamentalsDetail, `${fOn} on site or ${fOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.daxDeepDiveDetail, `${pOn} on site or ${pOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.daxFundamentalsDetail, `${dOn} on site or ${dOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.specialists["DAX fundamentals"], `${dOn} on site or ${dOnline} online, ex VAT`);
  assert.equal(copy.specialists["DAX deep dive"], `${pOn} on site or ${pOnline} online, ex VAT`);
  assert.equal(Object.keys(copy.specialists).length, 2, "two specialist courses are priced");
  assert.equal(copy.coachingRange, undefined, "coaching has no price band");
  assert.equal(copy.consultancyRange, `Usually a fixed price of ${kFrom} to ${kTo}, ex VAT`);
  assert.equal(copy.publicSeat, `${founding} a seat for this first run, then ${seat} for later runs. Plus VAT at checkout.`);
  assert.deepEqual([...copy.seatFacts], [`${founding} a seat for this first run, the founding rate`, `${seat} a seat for later runs`, "VAT is added at checkout"]);
  assert.equal(copy.seatBookFacts, `${founding} a seat for this first run, the founding rate. Later runs are ${seat} a seat. VAT is added at checkout.`);
  assert.equal(copy.trainingIntro, "Private course prices are per booking, for up to 8 people, and include UK travel.");
  rmSync(dir, { recursive: true, force: true });
});

test("the loader fails the build on missing, malformed, incomplete, extra or badly formatted rates", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  const expectCode = (code, data) => {
    if (data !== undefined) writeFile(file, data);
    assert.equal(thrownCode(() => loadTrainingPrices({ file })), code);
  };
  expectCode("missing");
  expectCode("invalid", '{"x": ');
  for (const shape of ["null", "[]", '"text"', "7"]) expectCode("incomplete", shape);
  for (const [course, key] of PRICE_SLOTS) {
    const missing = fixture();
    delete missing[course][key];
    expectCode("incomplete", missing);
    for (const bad of ["", 1500]) {
      const data = fixture();
      data[course][key] = bad;
      expectCode("format", data);
    }
  }
  // An unknown course or rate fails, so no figure can be added (coaching's, say) without a slot that renders it.
  const extraCourse = fixture();
  extraCourse.coaching = { from: amount(), to: amount() };
  expectCode("incomplete", extraCourse);
  const extraRate = fixture();
  extraRate.consultancy.typical = amount();
  expectCode("incomplete", extraRate);
  const n = amount();
  const digits = n.replace(/\D/g, "");
  for (const bad of [n.slice(1), "£", `£ ${n.slice(1)}`, `${n} + VAT`, `${n} ex VAT`, `${n}.00`, `${n},`, "£,100", `$${n.slice(1)}`, `${n} to ${amount()}`, `${n}\n`, "£abc", `£${digits[0]},,${digits.slice(1)}`, `£${digits[0]},${digits[1]}`]) {
    const data = fixture();
    data["dax-fundamentals"].online = bad;
    expectCode("format", data);
  }
  rmSync(dir, { recursive: true, force: true });
});

// ---- check-prices on built output ------------------------------------------------------------------------------------

const li = (text) => `<li>${text}</li>`;
const page = (...items) => `<html><body><ul>${items.join("")}</ul></body></html>`;
/** A minimal built site: every rate rendered once, coaching and the private 101 on request. */
function site(data, edits = {}) {
  const dir = workspace();
  writeFile(join(dir, PRICES_FILE), data);
  const copy = trainingPriceCopy(loadTrainingPrices({ file: join(dir, PRICES_FILE) }));
  const files = {
    "dist/index.html": page(li(copy.homeFundamentals), li(copy.publicSeat), li("Private for your team: price on request")),
    "dist/training/index.html": page(li(copy.trainingFundamentals), ...Object.values(copy.specialists).map(li), li("Private for your team: price on request"), li("Price on request")),
    "dist/power-bi/index.html": page(li(copy.consultancyRange)),
    "dist/about/index.html": page(li("About")),
    "dist/writing/we-are-all-middle-management-now/index.html": page(li("my CEO loses £50 million")),
    ...edits,
  };
  for (const [path, text] of Object.entries(files)) writeFile(join(dir, path), text);
  return dir;
}
const check = (dir) => {
  const result = spawnSync(process.execPath, [join(root, "scripts", "check-prices.mjs"), dir], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return { status: result.status, output: result.stdout + result.stderr };
};

test("check-prices passes a site that shows exactly the tracked rates", () => {
  const result = check(site(fixture()));
  assert.equal(result.status, 0, result.output);
});

test("check-prices fails on any amount that is not a tracked rate, wherever it appears", () => {
  const data = fixture();
  const stray = amount();
  for (const [path, html] of [
    ["dist/about/index.html", page(li(`From ${stray}`))],
    ["dist/power-bi/index.html", page(li(`Usually a fixed price of ${data.consultancy.from} to ${data.consultancy.to}${stray.slice(-1)}, ex VAT`))],
    ["dist/about/index.html", `<html><head><meta name="description" content="${stray}"></head></html>`],
    ["dist/about/index.html", page(li(`&pound;${stray.slice(1)}`))],
    ["dist/about/index.html", page(li(`${stray.slice(1)} GBP`))],
    ["dist/llms.txt", `Courses from ${stray}`],
    ["dist/writing/other/index.html", page(li("£50"))],
  ]) {
    const result = check(site(data, { [path]: html }));
    assert.equal(result.status, 1, `${path} must fail`);
    assert.match(result.output, /unknown-amount/);
  }
});

test("check-prices fails when a tracked rate renders nowhere", () => {
  const result = check(site(fixture(), { "dist/power-bi/index.html": page(li("Price on request, usually a fixed price")) }));
  assert.equal(result.status, 1);
  assert.match(result.output, /rate-not-shown/);
});

test("check-prices fails unless coaching and the private 101 say price on request", () => {
  const data = fixture();
  const noCoaching = check(site(data, { "dist/training/index.html": page(...valuesOf(data).map(li), li("Private for your team: price on request")) }));
  assert.match(noCoaching.output, /coaching-not-on-request/);
  const noPrivate = check(site(data, { "dist/index.html": page(...valuesOf(data).map(li)) }));
  assert.match(noPrivate.output, /private-101-not-on-request\s+dist\/index\.html/);
});

test("check-prices fails when the prices file or dist is missing", () => {
  const dir = workspace();
  assert.match(check(dir).output, /prices-missing/);
  const noDist = workspace();
  writeFile(join(noDist, PRICES_FILE), fixture());
  assert.match(check(noDist).output, /dist-missing/);
});

// ---- Workflows -----------------------------------------------------------------------------------------------------

test("the production workflow tests and uploads the same artifact, from main only", () => {
  const deployText = readFileSync(join(root, ".github", "workflows", "deploy.yml"), "utf8");
  const deploy = parse(deployText);
  const steps = deploy.jobs.build.steps;
  const names = steps.map((step) => step.name);
  const afterTests = steps.slice(names.indexOf("Test the built artifact") + 1).map((step) => step.run ?? step.uses).join("\n");
  assert.ok(!/npm run build|astro build|npm run gate/.test(afterTests), "nothing rebuilds after the tests");
  assert.ok(names.indexOf("Check the build is fit to release") < names.indexOf("Upload the tested artifact"), "the release check precedes upload");
  assert.equal(steps.find((step) => step.name === "Check the build is fit to release").run, "npm run check:release");
  assert.equal(deploy.jobs.deploy.if, "github.ref == 'refs/heads/main'", "only main deploys");
  assert.equal(steps.find((step) => step.uses?.startsWith("actions/upload-pages-artifact")).with.path, "dist", "only dist is uploaded");
  assert.ok(!/upload-artifact/.test(deployText), "no test, report or Lighthouse artifact is uploaded");
});
