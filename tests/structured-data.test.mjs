// Structured data, llms.txt and the IndexNow key, checked against the built dist/ (build first).
// Page-specific JSON-LD must match what each page shows, carry no prices, and reference only nodes in its own graph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeHTML } from "entities";
import { BREADCRUMB_SECTIONS } from "../src/config/site.ts";
import { INDEXNOW_KEY } from "../src/config/indexnow.mjs";
import { indexedPages, llmsTxt } from "../src/integrations/llms-txt.mjs";

const dist = "dist";
const site = "https://burningsuit.co.uk";
const fileFor = (path) => join(dist, path.replace(/^\//, ""), "index.html");
const html = (path) => readFileSync(fileFor(path), "utf8");
const graph = (path) => {
  const blocks = [...html(path).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `${path}: one JSON-LD block`);
  return JSON.parse(blocks[0][1])["@graph"];
};
const node = (path, type) => {
  const found = graph(path).filter((entry) => entry["@type"] === type);
  assert.equal(found.length, 1, `${path}: one ${type}`);
  return found[0];
};
const metaDescription = (path) => decodeHTML(html(path).match(/<meta name="description" content="([^"]*)"/)[1]);
const runFacts = (path) => decodeHTML([...html(path).matchAll(/<ul class="run-facts"[^>]*>([\s\S]*?)<\/ul>/g)][0][1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const pages = indexedPages(dist);

test("every reference in each page's graph resolves within that graph, and no graph carries price data", () => {
  for (const { path } of pages) {
    const nodes = graph(path);
    const ids = new Set(nodes.map((entry) => entry["@id"]));
    const refs = [];
    JSON.stringify(nodes, (key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).join() === "@id") refs.push(value["@id"]);
      return value;
    });
    for (const ref of refs) assert(ids.has(ref), `${path}: unresolved reference ${ref}`);
    assert.doesNotMatch(JSON.stringify(nodes), /"(offers?|price\w*|Offer)"/, `${path}: price data in JSON-LD`);
  }
});

const courses = {
  "/training/power-bi-fundamentals/": { modes: ["Onsite", "Online"], workload: "P2D", length: "2 days" },
  "/training/dax-fundamentals/": { modes: ["Onsite", "Online"], workload: "P1D", length: "1 day" },
  "/training/dax-deep-dive/": { modes: ["Onsite", "Online"], workload: "P2D", length: "2 days" },
  "/training/agentic-development-for-power-bi/": { modes: "Online", workload: "PT3H", length: "Half a day, live online" },
};
for (const [path, expected] of Object.entries(courses)) {
  test(`${path} describes its course as the page does`, () => {
    const course = node(path, "Course");
    const title = decodeHTML(html(path).match(/<title>([^<]*)<\/title>/)[1]).replace(/ \| burningsuit$/, "");
    assert.equal(course.name, title);
    assert.equal(course.url, site + path);
    assert(metaDescription(path).startsWith(course.description), "course description is the page's approved description");
    const run = course.hasCourseInstance;
    assert.deepEqual(run.courseMode, expected.modes);
    assert.equal(run.courseWorkload, expected.workload);
    const facts = runFacts(path);
    assert(facts.includes(expected.length), "length matches the facts list");
    assert.match(facts, new RegExp(`(Up to|4 to) ${run.maximumAttendeeCapacity} people`), "group size matches the facts list");
    if (run.startDate) {
      const shown = html(path).match(/<time datetime="(\d{4}-\d{2}-\d{2})">[^<]*<\/time>, 9:30am to 12:30pm UK time/);
      assert(shown, "the run date and time are on the page");
      assert.equal(run.startDate, `${shown[1]}T09:30:00+00:00`);
      assert.equal(run.endDate, `${shown[1]}T12:30:00+00:00`);
    }
  });
}

test("the training chooser lists every course page, the consultancy page is a Service and About a ProfilePage", () => {
  const list = node("/training/", "ItemList").itemListElement.map((item) => item.url);
  assert.deepEqual([...list].sort(), Object.keys(courses).map((path) => site + path).sort());
  const service = node("/power-bi/", "Service");
  assert(metaDescription("/power-bi/").startsWith(service.description));
  const profile = node("/about/", "ProfilePage");
  const image = new URL(profile.primaryImageOfPage.url);
  assert.equal(image.origin, site);
  assert(existsSync(join(dist, image.pathname)), "the profile image is built");
  assert(html("/about/").includes(image.pathname), "the profile image is shown on About");
});

test("breadcrumbs name their section pages by title and point only at indexed pages", () => {
  for (const [section, name] of Object.entries(BREADCRUMB_SECTIONS)) {
    assert.equal(decodeHTML(html(section).match(/<title>([^<]*)<\/title>/)[1]), `${name} | burningsuit`);
  }
  const indexed = new Set(pages.map((page) => site + page.path));
  const nested = pages.filter((page) => /^\/(training|work|privacy)\/[^/]+\/$/.test(page.path));
  assert(nested.length >= 10);
  for (const { path } of nested) {
    const crumbs = node(path, "BreadcrumbList").itemListElement;
    assert.deepEqual(crumbs.map((crumb) => crumb.position), [1, 2, 3]);
    assert.equal(crumbs.at(-1).item, site + path);
    for (const crumb of crumbs) assert(indexed.has(crumb.item), `${path}: crumb ${crumb.item} is not an indexed page`);
  }
});

test("llms.txt is generated from the built pages and lists exactly the sitemap's URLs", () => {
  const written = readFileSync(join(dist, "llms.txt"), "utf8");
  assert.equal(written, llmsTxt(dist));
  const listed = [...written.matchAll(/\]\((https:[^)]+)\)/g)].map((match) => match[1]).sort();
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemap = locs(readFileSync(join(dist, "sitemap-0.xml"), "utf8")).filter((url) => url !== `${site}/`).sort();
  assert.deepEqual(listed, sitemap);
  assert.doesNotMatch(written, /[£$€]|\bGBP\b|ex VAT|founding rate/i);
});

test("the IndexNow key file is published with the configured key", () => {
  assert.match(INDEXNOW_KEY, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(join(dist, `${INDEXNOW_KEY}.txt`), "utf8").trim(), INDEXNOW_KEY);
});
