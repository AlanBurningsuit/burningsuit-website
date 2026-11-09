import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { loadTrainingPrices, trainingPriceCopy, TrainingPricesError, PRICE_SLOTS, PRICES_FILE, validatePrices } from "../src/lib/training-prices.mjs";
import { decodePriceEntities } from "../scripts/price-text.mjs";

// Every amount below is generated at run time from a counter. No monetary literal is committed, and no assertion message can carry a value.
const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, "..", "scripts");
let seed = 4321;
const amount = () => `£${(seed += 1117).toLocaleString("en-GB")}`;
const fixture = () => {
  const data = {};
  for (const [course, key] of PRICE_SLOTS) (data[course] ??= {})[key] = amount();
  return data;
};
const workspace = (prefix = "bs-prices-") => mkdtempSync(join(tmpdir(), prefix));
const writeJson = (path, data) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data)); };
const valuesOf = (data) => PRICE_SLOTS.map(([course, key]) => data[course][key]);
const priced = { SHOW_TRAINING_PRICES: "true" };
// Git exports GIT_DIR and friends to hooks (the pre-push hook runs these tests). Fixture repositories and the scripts
// that read them must never inherit those, or git would act on this repository instead of the fixture.
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
const run = (script, args, options = {}) => spawnSync(process.execPath, [join(scripts, script), ...args], { encoding: "utf8", env: cleanEnv, ...options });
const output = (result) => result.stdout + result.stderr;
const leaks = (result, values) => values.some((value) => output(result).includes(value) || output(result).includes(value.replaceAll(",", "")));

// ---- Loader ----------------------------------------------------------------------------------------------------------

test("default and non-exact flags ignore an existing private file", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  writeJson(file, fixture());
  for (const value of [undefined, "", "false", "TRUE", "True", "1", "yes", " true", "true "]) {
    assert.equal(loadTrainingPrices({ env: value === undefined ? {} : { SHOW_TRAINING_PRICES: value }, file }), null, "an unrequested build is unpriced");
  }
  rmSync(dir, { recursive: true, force: true });
});

test("the unrequested build never reads the file (an unreadable or invalid file cannot affect it)", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  writeJson(file, "{ not json");
  assert.equal(loadTrainingPrices({ env: {}, file }), null);
  assert.equal(loadTrainingPrices({ env: {}, file: join(dir, "absent.json") }), null);
  rmSync(dir, { recursive: true, force: true });
});

test("a requested build with valid input returns every rate and composes the approved wording", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  const data = fixture();
  writeJson(file, data);
  const prices = loadTrainingPrices({ env: priced, file });
  const copy = trainingPriceCopy(prices);
  const [fOn, fOnline, dOn, dOnline, pOn, pOnline, founding, seat, kFrom, kTo] = valuesOf(data);
  assert.equal(copy.homeFundamentals, `${fOn} on site or ${fOnline} online, per booking for up to 8 people, ex VAT, UK travel included`);
  assert.equal(copy.trainingFundamentals, `${fOn} on site or ${fOnline} online, ex VAT`);
  assert.equal(copy.fundamentalsDetail, `${fOn} on site or ${fOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.daxDeepDiveDetail, `${pOn} on site or ${pOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.daxFundamentalsDetail, `${dOn} on site or ${dOnline} online, per booking, ex VAT, UK travel included`);
  assert.equal(copy.specialists["DAX fundamentals"], `${dOn} on site or ${dOnline} online, ex VAT`);
  assert.equal(Object.keys(copy.specialists).length, 2, "two specialist courses are priced");
  assert.equal(copy.coachingRange, undefined, "coaching has no price band");
  assert.equal(copy.consultancyRange, `Usually a fixed price of ${kFrom} to ${kTo}, ex VAT`);
  assert.equal(copy.specialists["DAX deep dive"], `${pOn} on site or ${pOnline} online, ex VAT`);
  assert.equal(copy.publicSeat, `${founding} a seat for this first run, then ${seat} for later runs. Plus VAT at checkout.`);
  assert.deepEqual([...copy.seatFacts], [`${founding} a seat for this first run, the founding rate`, `${seat} a seat for later runs`, "VAT is added at checkout"]);
  assert.equal(copy.seatBookFacts, `${founding} a seat for this first run, the founding rate. Later runs are ${seat} a seat. VAT is added at checkout.`);
  assert.equal(copy.trainingIntro, "Private course prices are per booking, for up to 8 people, and include UK travel.");
  assert.equal(trainingPriceCopy(null), null, "the unpriced variant has no price wording");
  rmSync(dir, { recursive: true, force: true });
});

test("a requested build fails closed on missing, malformed, incomplete or badly formatted input, without printing values", () => {
  const dir = workspace();
  const file = join(dir, "prices.json");
  const expectCode = (code, data) => {
    if (data !== undefined) writeJson(file, data);
    let thrown;
    try { loadTrainingPrices({ env: priced, file }); } catch (error) { thrown = error; }
    assert.ok(thrown instanceof TrainingPricesError, "requested input must stop the build");
    assert.equal(thrown.code, code);
    return thrown;
  };
  expectCode("missing");
  const marker = amount();
  const err = expectCode("invalid", `{"x": "${marker}", `);
  assert.ok(!`${err.message} ${err.stack}`.includes(marker), "parser input is never echoed");
  for (const shape of ["null", "[]", '"text"', "7"]) expectCode("incomplete", shape);
  for (const [course, key] of PRICE_SLOTS) {
    const data = fixture();
    delete data[course][key];
    expectCode("incomplete", data);
    const empty = fixture();
    empty[course][key] = "";
    expectCode("incomplete", empty);
    const number = fixture();
    number[course][key] = 1500;
    expectCode("incomplete", number);
  }
  const noCourse = fixture();
  delete noCourse["dax-deep-dive"];
  expectCode("incomplete", noCourse);
  const n = amount();
  const unsafe = [n.slice(1), "£", `£ ${n.slice(1)}`, `${n} + VAT`, `${n} ex VAT`, `${n}.00`, `${n},`, "£,100", `$${n.slice(1)}`, `${n} to ${amount()}`, `${n}\n`, "£abc"];
  for (const bad of unsafe) {
    const data = fixture();
    data["dax-fundamentals"].online = bad;
    const thrown = expectCode("format", data);
    assert.ok(!thrown.message.includes(bad.trim()) || bad.trim() === "", "the offending value is never repeated");
  }
  rmSync(dir, { recursive: true, force: true });
});

test("validatePrices accepts only the expected shape and format", () => {
  assert.equal(validatePrices(fixture()).length, PRICE_SLOTS.length);
  const extra = fixture();
  extra.other = { ignored: "free text" };
  assert.equal(validatePrices(extra).length, PRICE_SLOTS.length, "unrelated keys are never read");
});

test("a requested price rejects malformed thousands separators", () => {
  const digits = amount().replace(/\D/g, "");
  for (const malformed of [`£${digits.slice(0, 1)},,${digits.slice(1)}`, `£${digits.slice(0, 1)},${digits.slice(1, 2)}`]) {
    const data = fixture();
    data["power-bi-fundamentals"].onSite = malformed;
    let refused = false;
    try { validatePrices(data); } catch (error) { refused = error instanceof TrainingPricesError && error.code === "format"; }
    assert.ok(refused, "malformed grouping must fail with a fixed format error");
  }
});

// ---- Tracked-file gate -----------------------------------------------------------------------------------------------

const tracked = (files, extra = {}) => {
  const dir = workspace("bs-gate-");
  for (const [path, text] of Object.entries(files)) writeJson(join(dir, path), text);
  return dir;
};
const gate = (dir, args = []) => run("check-prices.mjs", [...args, dir]);

test("clean tracked files pass", () => {
  const dir = tracked({ "src/page.astro": "<p>Price on request</p>", "README.md": "Prices live in a private file." });
  assert.equal(gate(dir).status, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("a tracked monetary literal or price assignment fails with the rule and path only", () => {
  const sample = amount();
  const bare = sample.slice(1).replaceAll(",", "");
  const cases = {
    "src/a.astro": `<li>${sample} a seat</li>`,
    "src/b.mjs": `const x = "€${bare}";`,
    "tests/c.ts": `expect(text).toBe("$${bare}");`,
    "docs/d.md": `It costs ${bare} GBP per day.`,
    "src/e.mjs": `const price = ${bare};`,
    "src/f.json": `{ "seatFoundingRate": "${bare}" }`,
  };
  for (const [path, text] of Object.entries(cases)) {
    const dir = tracked({ [path]: text });
    const result = gate(dir);
    assert.equal(result.status, 1, `${path} must be rejected`);
    assert.match(output(result), new RegExp(`${path.replace(".", "\\.")}`));
    assert.ok(!output(result).includes(bare), "diagnostics never include the matched text");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a private prices file or anything under design/ is rejected when tracked", () => {
  const dir = workspace("bs-gate-git-");
  execFileSync("git", ["init", "-q"], { env: cleanEnv, cwd: dir });
  writeJson(join(dir, PRICES_FILE), fixture());
  writeJson(join(dir, "src/page.astro"), "<p>Price on request</p>");
  execFileSync("git", ["add", "-f", "-A"], { env: cleanEnv, cwd: dir });
  const result = gate(dir);
  assert.equal(result.status, 1);
  assert.match(output(result), /private-file-tracked/);
  assert.ok(!leaks(result, valuesOf(JSON.parse(readFileSync(join(dir, PRICES_FILE), "utf8")))), "no value in diagnostics");
  rmSync(dir, { recursive: true, force: true });
  // The same file present but untracked (as the gitignored design/ link is) is fine.
  const clean = workspace("bs-gate-git-");
  execFileSync("git", ["init", "-q"], { env: cleanEnv, cwd: clean });
  writeJson(join(clean, PRICES_FILE), fixture());
  writeJson(join(clean, "src/page.astro"), "<p>Price on request</p>");
  writeFileSync(join(clean, ".gitignore"), "design/\n");
  execFileSync("git", ["add", "-A"], { env: cleanEnv, cwd: clean });
  assert.equal(gate(clean).status, 0);
  rmSync(clean, { recursive: true, force: true });
});

test("an exact private value in a tracked file is caught even where literals are otherwise tolerated", () => {
  const data = fixture();
  const dir = tracked({ [PRICES_FILE]: data, "src/content/writing/we-are-all-middle-management-now.mdx": `A line mentioning ${data["dax-deep-dive"].online} in passing.` });
  // The private file itself is untracked here only because this fixture has no git; scope the scan to the tolerated file.
  const result = gate(dir);
  assert.equal(result.status, 1);
  assert.match(output(result), /private-value/);
  assert.ok(!leaks(result, valuesOf(data)), "no value in diagnostics");
  rmSync(dir, { recursive: true, force: true });
});

test("reviewed source exceptions reject new prices even without private input", () => {
  for (const path of ["tests/fixtures/umami/script.js", "diagrams/export.mjs", "content/writing/we-are-all-middle-management-now.mdx", "src/content/writing/we-are-all-middle-management-now.mdx"]) {
    const original = readFileSync(join(here, "..", path), "utf8");
    const dir = tracked({ [path]: original });
    assert.equal(gate(dir).status, 0, "unchanged reviewed bytes remain permitted");
    const sample = amount();
    writeFileSync(join(dir, path), `${original}\nTraining price: ${sample}\n`);
    const result = gate(dir);
    assert.equal(result.status, 1, "editing an exempt file must not hide a price");
    assert.match(output(result), /monetary-literal/);
    assert.ok(!output(result).includes(sample), "diagnostics never print the price");
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- Built-output gate -----------------------------------------------------------------------------------------------

const li = (text) => `<li>${text}</li>`;
function distFixture(data, { pricedBuild, drop } = {}) {
  const dir = workspace("bs-dist-");
  writeJson(join(dir, PRICES_FILE), data);
  const copy = trainingPriceCopy(loadTrainingPrices({ env: priced, file: join(dir, PRICES_FILE) }));
  const page = (...items) => `<html><body><ul>${items.join("")}</ul></body></html>`;
  const home = pricedBuild ? page(li(copy.homeFundamentals), li(copy.publicSeat), li("Price on request")) : page(li("On site or online"), li("Price on request"), li("Price on request"));
  const training = pricedBuild
    ? page(li(copy.trainingFundamentals), li(copy.publicSeat), ...Object.values(copy.specialists).map(li), li(copy.trainingIntro), li("Price on request"), li("Price on request"))
    : page(li("Price on request"), li("Price on request"));
  const agents = pricedBuild ? `<html><body>${copy.seatFacts.map(li).join("")}<p>${copy.seatBookFacts}</p></body></html>` : page(li("Price on request"));
  const fundamentals = pricedBuild ? page(li(copy.fundamentalsDetail)) : page(li("On site or online"), li("Price on request"));
  const daxDeepDive = pricedBuild ? page(li(copy.daxDeepDiveDetail)) : page(li("On site or online"), li("Price on request"));
  const daxFundamentals = pricedBuild ? page(li(copy.daxFundamentalsDetail)) : page(li("On site or online"), li("Price on request"));
  const files = {
    "dist/index.html": home, "dist/training/index.html": training,
    "dist/training/agentic-development-for-power-bi/index.html": agents, "dist/training/power-bi-fundamentals/index.html": fundamentals,
    "dist/training/dax-deep-dive/index.html": daxDeepDive, "dist/training/dax-fundamentals/index.html": daxFundamentals,
    "dist/power-bi/index.html": pricedBuild ? page(li(copy.consultancyRange)) : page(li("Price on request, usually a fixed price")),
  };
  if (drop) delete files[drop];
  for (const [path, text] of Object.entries(files)) writeJson(join(dir, path), text);
  return { dir, copy };
}
const distRun = (dir, env) => run("check-prices.mjs", ["--dist", dir], { env: { ...process.env, SHOW_TRAINING_PRICES: "", ...env } });

test("the essay exception permits only its approved paragraph, never added prices", () => {
  const original = readFileSync(join(here, "..", "src/content/writing/we-are-all-middle-management-now.mdx"), "utf8");
  const anecdote = original.split(/\r?\n/).find((line) => line.startsWith("With an agent,"));
  assert.ok(anecdote, "the reviewed anecdote exists");
  const dir = workspace("bs-dist-exception-");
  const path = join(dir, "dist/writing/we-are-all-middle-management-now/index.html");
  writeJson(path, `<html><body><p>${anecdote}</p></body></html>`);
  assert.equal(distRun(dir, {}).status, 0, "the existing anecdote remains permitted");
  const sample = amount();
  writeJson(path, `<html><body><p>${anecdote}</p><p>${sample} a seat</p></body></html>`);
  const result = distRun(dir, {});
  assert.equal(result.status, 1, "a new amount on the essay route must fail without private input");
  assert.match(output(result), /monetary-literal/);
  assert.ok(!output(result).includes(sample), "diagnostics never print the price");
  rmSync(dir, { recursive: true, force: true });
});

test("an unpriced build contains no amounts, no price wording and no private values on any route", () => {
  const data = fixture();
  const { dir } = distFixture(data, { pricedBuild: false });
  assert.equal(distRun(dir, {}).status, 0);
  writeJson(join(dir, "dist/power-bi/index.html"), `<p>${data["dax-fundamentals"].online}</p>`);
  const result = distRun(dir, {});
  assert.equal(result.status, 1);
  assert.match(output(result), /price-outside-scope\s+dist\/power-bi\/index\.html/);
  assert.ok(!leaks(result, valuesOf(data)), "no value in diagnostics");
  writeJson(join(dir, "dist/power-bi/index.html"), "<p>Price on request</p>");
  writeJson(join(dir, "dist/index.html"), "<p>Priced in ex VAT terms</p>");
  assert.match(output(distRun(dir, {})), /price-wording-outside-scope/);
  rmSync(dir, { recursive: true, force: true });
});

test("a priced build must render every slot and keep Price on request only for the private 101", () => {
  const data = fixture();
  const { dir } = distFixture(data, { pricedBuild: true });
  assert.equal(distRun(dir, priced).status, 0);
  rmSync(dir, { recursive: true, force: true });

  const missing = distFixture(data, { pricedBuild: true, drop: "dist/training/power-bi-fundamentals/index.html" });
  const result = distRun(missing.dir, priced);
  assert.equal(result.status, 1);
  assert.match(output(result), /priced-slot-missing\s+dist\/training\/power-bi-fundamentals\/index\.html/);
  assert.ok(!leaks(result, valuesOf(data)), "no value in diagnostics");
  rmSync(missing.dir, { recursive: true, force: true });

  // The DAX deep dive is the fifth priced route: a missing page or a fallback phrase there fails too.
  const missingDeepDive = distFixture(data, { pricedBuild: true, drop: "dist/training/dax-deep-dive/index.html" });
  const deepDiveResult = distRun(missingDeepDive.dir, priced);
  assert.equal(deepDiveResult.status, 1);
  assert.match(output(deepDiveResult), /priced-slot-missing\s+dist\/training\/dax-deep-dive\/index\.html/);
  assert.ok(!leaks(deepDiveResult, valuesOf(data)), "no value in diagnostics");
  writeJson(join(missingDeepDive.dir, "dist/training/dax-deep-dive/index.html"), `<ul>${li(missingDeepDive.copy.daxDeepDiveDetail)}${li("On site or online")}</ul>`);
  assert.match(output(distRun(missingDeepDive.dir, priced)), /unpriced-phrase-in-priced-slot\s+dist\/training\/dax-deep-dive\/index\.html/);
  rmSync(missingDeepDive.dir, { recursive: true, force: true });

  // DAX fundamentals is the sixth priced route, checked the same way.
  const missingDaxFundamentals = distFixture(data, { pricedBuild: true, drop: "dist/training/dax-fundamentals/index.html" });
  const daxFundamentalsResult = distRun(missingDaxFundamentals.dir, priced);
  assert.equal(daxFundamentalsResult.status, 1);
  assert.match(output(daxFundamentalsResult), /priced-slot-missing\s+dist\/training\/dax-fundamentals\/index\.html/);
  assert.ok(!leaks(daxFundamentalsResult, valuesOf(data)), "no value in diagnostics");
  writeJson(join(missingDaxFundamentals.dir, "dist/training/dax-fundamentals/index.html"), `<ul>${li(missingDaxFundamentals.copy.daxFundamentalsDetail)}${li("Price on request")}</ul>`);
  assert.match(output(distRun(missingDaxFundamentals.dir, priced)), /unpriced-phrase-in-priced-slot\s+dist\/training\/dax-fundamentals\/index\.html/);
  rmSync(missingDaxFundamentals.dir, { recursive: true, force: true });

  // A slot that still reads Price on request in priced output is a failure.
  const fallback = distFixture(data, { pricedBuild: true });
  writeJson(join(fallback.dir, "dist/training/power-bi-fundamentals/index.html"), `<ul>${li(fallback.copy.fundamentalsDetail)}${li("Price on request")}</ul>`);
  assert.match(output(distRun(fallback.dir, priced)), /unpriced-phrase-in-priced-slot/);
  // A rate leaking to another route is a failure.
  writeJson(join(fallback.dir, "dist/training/power-bi-fundamentals/index.html"), `<ul>${li(fallback.copy.fundamentalsDetail)}</ul>`);
  writeJson(join(fallback.dir, "dist/about/index.html"), `<ul>${li(data["dax-fundamentals"].onSite)}</ul>`);
  assert.match(output(distRun(fallback.dir, priced)), /price-outside-scope\s+dist\/about\/index\.html/);
  rmSync(fallback.dir, { recursive: true, force: true });
});

test("a priced build with the private file missing fails closed with a fixed rule", () => {
  const data = fixture();
  const { dir } = distFixture(data, { pricedBuild: true });
  rmSync(join(dir, PRICES_FILE));
  const result = distRun(dir, priced);
  assert.equal(result.status, 1);
  assert.match(output(result), /prices-missing/);
  rmSync(dir, { recursive: true, force: true });
});

// ---- Masking runner and secret writer --------------------------------------------------------------------------------

test("the masking runner hides currency amounts and exact private rates, and keeps the exit code", () => {
  const dir = workspace("bs-mask-");
  const data = fixture();
  const stored = data["power-bi-fundamentals"].onSite;
  writeJson(join(dir, PRICES_FILE), data);
  const program = `console.log("a ${stored} b ${stored.replaceAll(",", "")} c ${amount()}"); console.error("e ${amount()}"); process.exit(3)`;
  const result = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
  assert.equal(result.status, 3);
  assert.ok(!/[£€$]\s?\d/.test(output(result)) && !leaks(result, valuesOf(data)), "no amount survives");
  assert.match(result.stdout, /\[amount\]/);
  rmSync(dir, { recursive: true, force: true });
});

test("named, decimal and hexadecimal currency entities cannot bypass either privacy gate", () => {
  const sample = amount();
  const digits = sample.slice(1);
  const forms = [
    `&pound;${digits}`, `&#163;${digits}`, `&#xa3;${digits}`,
    `&pound;&nbsp;${digits}`,
    [...sample].map((character) => `&#${character.codePointAt(0)};`).join(""),
    [...sample].map((character) => `&#x${character.codePointAt(0).toString(16)};`).join(""),
  ];
  for (const encoded of forms) {
    const dir = tracked({ "src/page.astro": `<p>${encoded} a seat</p>` });
    const source = gate(dir);
    assert.equal(source.status, 1, "encoded source amounts must be rejected without private input");
    assert.match(output(source), /monetary-literal/);
    writeJson(join(dir, "dist/index.html"), `<p>${encoded} a seat</p>`);
    const dist = distRun(dir, {});
    assert.equal(dist.status, 1, "encoded unpriced HTML amounts must be rejected without private input");
    assert.match(output(dist), /monetary-literal/);
    assert.ok(!output(source).includes(encoded) && !output(dist).includes(encoded), "diagnostics never echo the encoded amount");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exact private-value scans decode character references before comparison", () => {
  const data = fixture();
  const sample = valuesOf(data)[0];
  const encoded = [...sample].map((character) => `&#x${character.codePointAt(0).toString(16)};`).join("");
  const dir = tracked({ [PRICES_FILE]: data, "src/page.astro": `<p>${encoded}</p>` });
  const source = gate(dir);
  assert.equal(source.status, 1);
  assert.match(output(source), /private-value\s+src\/page\.astro/);
  writeJson(join(dir, "dist/index.html"), `<p>${encoded}</p>`);
  const dist = distRun(dir, {});
  assert.equal(dist.status, 1);
  assert.match(output(dist), /price-outside-scope\s+dist\/index\.html/);
  assert.ok(!leaks(source, valuesOf(data)) && !leaks(dist, valuesOf(data)), "fixed diagnostics hold no private amount");
  rmSync(dir, { recursive: true, force: true });
});

test("the masking runner redacts character references, including fully encoded amounts and split chunks", () => {
  const sample = amount();
  const forms = [
    `&pound;${sample.slice(1)}`, `&#163;${sample.slice(1)}`, `&#xa3;${sample.slice(1)}`,
    `&pound;&nbsp;${sample.slice(1)}`,
    [...sample].map((character) => `&#${character.codePointAt(0)};`).join(""),
    [...sample].map((character) => `&#x${character.codePointAt(0).toString(16)};`).join(""),
  ];
  const dir = workspace("bs-mask-entities-");
  for (const encoded of forms) {
    const half = Math.floor(encoded.length / 2);
    const program = `process.stdout.write(${JSON.stringify(encoded.slice(0, half))}); setTimeout(() => { console.log(${JSON.stringify(encoded.slice(half))}); console.error(${JSON.stringify(encoded)}); process.exitCode = 3; }, 5);`;
    const result = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
    assert.equal(result.status, 3);
    assert.ok(output(result).includes("[amount]") && !output(result).includes(encoded) && !output(result).includes(sample.slice(1)), "no encoded or decoded amount survives masking");
  }
  rmSync(dir, { recursive: true, force: true });
});

const separatorNames = [
  "thinsp", "NegativeThinSpace", "ZeroWidthSpace", "NegativeVeryThinSpace", "NegativeMediumSpace", "NegativeThickSpace",
  "nbsp", "NonBreakingSpace", "ensp", "emsp", "emsp13", "emsp14", "numsp", "puncsp", "ThinSpace", "MediumSpace", "ThickSpace", "hairsp", "VeryThinSpace",
  "Tab", "NewLine", "NoBreak", "ApplyFunction", "af", "InvisibleTimes", "it", "InvisibleComma", "ic", "lrm", "rlm", "shy", "zwj", "zwnj",
];

test("complete entity decoding and Unicode formatting canonicalise price separators", () => {
  const sample = amount();
  for (const name of separatorNames) {
    assert.ok(decodePriceEntities(`&pound;&${name};${sample.slice(1)}`) === sample, "named separator must not disguise the amount");
  }
  for (let code = 0; code <= 0x10ffff; code++) {
    const character = String.fromCodePoint(code);
    if (/[\p{White_Space}\p{Cf}\p{Default_Ignorable_Code_Point}]/u.test(character)) {
      assert.ok(decodePriceEntities(`${sample[0]}${character}${sample.slice(1)}`) === sample, "Unicode separator must not disguise the amount");
    }
  }
});

test("named spacing and invisible formats fail source, dist and exact-value scans and are masked across chunks", () => {
  const data = fixture();
  const sample = valuesOf(data)[0];
  const separators = [...separatorNames.map((name) => `&${name};`), String.fromCodePoint(0x200b), String.fromCodePoint(0x2060), String.fromCodePoint(0xfe0f), "\n"];
  for (const separator of separators) {
    const encoded = `&pound;${separator}${sample.slice(1)}`;
    const dir = tracked({ "src/page.astro": `<p>${encoded} a seat</p>` });
    const source = gate(dir);
    assert.equal(source.status, 1, "source must reject named and invisible separators without private input");
    assert.match(output(source), /monetary-literal/);
    writeJson(join(dir, "dist/index.html"), `<p>${encoded} a seat</p>`);
    const dist = distRun(dir, {});
    assert.equal(dist.status, 1, "unpriced dist must reject named and invisible separators without private input");
    assert.match(output(dist), /monetary-literal/);

    // Split immediately after the currency/separator; literal newlines must not flush an unmasked prefix.
    const prefix = `&pound;${separator}`;
    const program = `process.stdout.write(${JSON.stringify(prefix)}); setTimeout(() => { console.log(${JSON.stringify(sample.slice(1))}); process.exitCode = 3; }, 5);`;
    const masked = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
    assert.equal(masked.status, 3);
    assert.ok(output(masked).includes("[amount]") && !output(masked).includes(sample.slice(1)), "separator or chunk boundaries must not expose digits");

    writeJson(join(dir, PRICES_FILE), data);
    assert.match(output(gate(dir)), /private-value\s+src\/page\.astro/, "exact private comparisons use canonical text");
    assert.match(output(distRun(dir, {})), /price-outside-scope\s+dist\/index\.html/, "dist private comparisons use canonical text");
    assert.ok(!leaks(source, valuesOf(data)) && !leaks(dist, valuesOf(data)), "diagnostics never echo values");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("markup-split amounts fail source, dist and exact-value scans and are masked across chunk boundaries", () => {
  const data = fixture();
  const sample = valuesOf(data)[0];
  const digits = sample.slice(1);
  const forms = [
    `${sample[0]}<span>${digits}</span>`,
    `${sample[0]}<!-- separator -->${digits}`,
    `<span>${sample[0]}</span><em>${digits}</em>`,
    `${sample[0]}${[...digits].map((character) => `<b>${character}</b>`).join("")}`,
    `${sample[0]}${digits[0]}<!-- split --><span>${digits.slice(1)}</span>`,
    `<span title="quoted > attribute">${sample[0]}</span><span>${digits}</span>`,
    `${sample[0]}\n<!-- separator\ncontinues -->\n<span>${digits[0]}\n</span><b>${digits.slice(1)}</b>`,
    `&pound;&lt;span&gt;${digits}&lt;/span&gt;`,
    `<script>const value = "${sample[0]}<span>${digits}</span>";</script>`,
    `<template><span>${sample[0]}</span><span>${digits}</span></template>`,
  ];
  for (const markup of forms) {
    const dir = tracked({ "src/page.astro": markup });
    const source = gate(dir);
    assert.equal(source.status, 1, "source must reject split markup without private input");
    assert.match(output(source), /monetary-literal/);
    writeJson(join(dir, "dist/index.html"), markup);
    const dist = distRun(dir, {});
    assert.equal(dist.status, 1, "unpriced dist must reject split markup without private input");
    assert.match(output(dist), /monetary-literal/);
    // Force separate writes through tags/comments and any embedded newlines.
    const chunks = markup.match(/.{1,3}|\n/g) ?? [];
    const program = `(async () => { for (const chunk of ${JSON.stringify(chunks)}) { process.stdout.write(chunk); await new Promise(r => setTimeout(r, 1)); } console.error(${JSON.stringify(markup)}); process.exitCode = 3; })();`;
    const masked = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
    assert.equal(masked.status, 3);
    assert.ok(!/\p{Nd}/u.test(output(masked)), "no digit fragment may escape markup/chunk masking");
    assert.match(output(masked), /\[amount\]/);
    writeJson(join(dir, PRICES_FILE), data);
    assert.match(output(gate(dir)), /private-value\s+src\/page\.astro/);
    assert.match(output(distRun(dir, {})), /price-outside-scope\s+dist\/index\.html/);
    assert.ok(!leaks(source, valuesOf(data)) && !leaks(dist, valuesOf(data)), "diagnostics never echo an amount");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("literal scan coverage retains private values in attributes and comments", () => {
  const sample = amount();
  for (const markup of [`<div data-rate="${sample}">Example</div>`, `<!-- ${sample} -->`]) {
    const dir = tracked({ "src/page.astro": markup });
    assert.equal(gate(dir).status, 1, "markup removal must not hide a literal stored price");
    writeJson(join(dir, "dist/index.html"), markup);
    assert.equal(distRun(dir, {}).status, 1);
    const masked = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", `console.log(${JSON.stringify(markup)})`], { encoding: "utf8", cwd: dir });
    assert.equal(masked.status, 0);
    assert.ok(!/\p{Nd}/u.test(output(masked)), "hidden markup values must never reach the log");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("masking combines stdout and stderr before redacting split markup", () => {
  const sample = amount();
  const dir = workspace("bs-mask-channels-");
  const program = `process.stdout.write(${JSON.stringify(sample[0] + "<span>" + sample[1])}); setTimeout(() => { process.stderr.write(${JSON.stringify("<!-- split -->" + sample.slice(2) + "</span>")}); process.exitCode = 3; }, 20);`;
  const result = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
  assert.equal(result.status, 3);
  assert.ok(!/\p{Nd}/u.test(output(result)), "no price fragments across output channels");
  assert.match(output(result), /\[amount\]/);
  rmSync(dir, { recursive: true, force: true });
});

test("oversized command output is suppressed entirely rather than relayed unredacted", () => {
  const sample = amount();
  const dir = workspace("bs-mask-limit-");
  const program = `process.stdout.write(${JSON.stringify(sample)}); process.stdout.write(Buffer.alloc(8 * 1024 * 1024, 'x')); process.stdout.write(${JSON.stringify(sample)}); process.exitCode = 3;`;
  const result = spawnSync(process.execPath, [join(scripts, "run-masked.mjs"), process.execPath, "-e", program], { encoding: "utf8", cwd: dir });
  assert.equal(result.status, 3);
  assert.match(output(result), /output suppressed after the safe buffer limit/);
  assert.ok(!output(result).includes(sample.slice(1)), "no partial output from an oversized stream is exposed");
  rmSync(dir, { recursive: true, force: true });
});

test("the secret writer validates, writes with owner-only access, and enables pricing for later steps", () => {
  const dir = workspace("bs-secret-");
  const data = fixture();
  const envFile = join(dir, "github-env");
  writeFileSync(envFile, "");
  const secret = JSON.stringify({ ...data, extra: { note: "ignored" } });
  const result = spawnSync(process.execPath, [join(scripts, "write-training-prices.mjs")], {
    encoding: "utf8", cwd: dir, env: { PATH: process.env.PATH, TRAINING_PRICES_JSON: secret, GITHUB_ENV: envFile, GITHUB_ACTIONS: "true" },
  });
  assert.equal(result.status, 0);
  const file = join(dir, PRICES_FILE);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), data, "only the expected rates are kept");
  assert.equal(readFileSync(envFile, "utf8"), "SHOW_TRAINING_PRICES=true\n");
  const masks = result.stdout.split("\n").filter((line) => line.startsWith("::add-mask::"));
  assert.equal(masks.length, new Set(valuesOf(data).flatMap((value) => [value, value.replaceAll(",", "")])).size, "each rate is registered as a masked value");
  assert.equal(loadTrainingPrices({ env: priced, file }).fundamentals.onSite, data["power-bi-fundamentals"].onSite);
  rmSync(dir, { recursive: true, force: true });
});

test("the secret writer rejects empty, unset, malformed or incomplete secrets without echoing them", () => {
  const data = fixture();
  const marker = amount();
  const bad = { empty: "", blank: "  \n", garbage: `{ "x": "${marker}"`, incomplete: JSON.stringify({ "power-bi-fundamentals": { onSite: marker } }), format: JSON.stringify({ ...data, "dax-deep-dive": { onSite: `${marker} ex VAT`, online: data["dax-deep-dive"].online } }) };
  for (const [name, secret] of Object.entries(bad)) {
    const dir = workspace("bs-secret-");
    const result = spawnSync(process.execPath, [join(scripts, "write-training-prices.mjs")], { encoding: "utf8", cwd: dir, env: { PATH: process.env.PATH, TRAINING_PRICES_JSON: secret, GITHUB_ACTIONS: "true" } });
    assert.equal(result.status, 1, `${name} must be refused`);
    assert.ok(!output(result).includes(marker) && !output(result).includes("::add-mask::"), "nothing is echoed or registered");
    assert.equal(existsSync(join(dir, PRICES_FILE)), false, "no file is left behind");
    rmSync(dir, { recursive: true, force: true });
  }
  const dir = workspace("bs-secret-");
  const unset = spawnSync(process.execPath, [join(scripts, "write-training-prices.mjs")], { encoding: "utf8", cwd: dir, env: { PATH: process.env.PATH } });
  assert.equal(unset.status, 1);
  rmSync(dir, { recursive: true, force: true });
});

// ---- Workflow privacy ------------------------------------------------------------------------------------------------

const workflow = (name) => readFileSync(join(here, "..", ".github", "workflows", name), "utf8");

test("only the production workflow on main reads the secret, and every failure path cleans up", () => {
  assert.ok(!/secrets\./.test(workflow("validate.yml")), "validation never receives secrets");
  const deployText = workflow("deploy.yml");
  assert.equal(deployText.match(/secrets\./g)?.length, 1, "the secret is referenced exactly once");
  const deploy = parse(deployText);
  const steps = deploy.jobs.build.steps;
  const write = steps.find((step) => step.env?.TRAINING_PRICES_JSON);
  assert.equal(write.if, "github.ref == 'refs/heads/main'", "a dispatch from any other ref never reads it");
  assert.ok(/TRAINING_PRICES_JSON/.test(write.env.TRAINING_PRICES_JSON));
  const names = steps.map((step) => step.name);
  assert.ok(names.indexOf(write.name) < names.indexOf("Check, build and validate the site"), "prices are in place before the build");
  assert.equal(steps.find((step) => step.name === "Remove private training prices").if, "always()");
  assert.ok(names.indexOf("Reject unfinished rebuilds") < names.indexOf("Upload the tested artifact"), "the release check still precedes upload");
  assert.equal(steps.find((step) => step.name === "Reject unfinished rebuilds").run, "npm run check:release", "the release block is not weakened");
  for (const name of ["Check, build and validate the site", "Test the built artifact"]) assert.match(steps.find((step) => step.name === name).run, /^node scripts\/run-masked\.mjs /, "priced output passes through masking");
  assert.equal(deploy.jobs.deploy.if, "github.ref == 'refs/heads/main'", "only main deploys");
  assert.equal(deploy.jobs.build.steps.find((step) => step.uses?.startsWith("actions/upload-pages-artifact")).with.path, "dist", "only dist is uploaded");
  assert.ok(!/upload-artifact/.test(deployText), "no test, report or Lighthouse artifact is uploaded");
});

test("the production workflow runs the same artifact it tests: no rebuild between the priced tests and the upload", () => {
  const names = parse(workflow("deploy.yml")).jobs.build.steps.map((step) => step.run ?? step.uses);
  const afterTests = names.slice(names.findIndex((run) => /test:functional/.test(run ?? "")) + 1).join("\n");
  assert.ok(!/npm run build|astro build|npm run gate/.test(afterTests), "nothing rebuilds after the tests");
});
