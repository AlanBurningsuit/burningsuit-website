import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { formActionFor } from "../src/config/enquiry.mjs";
import { RUN } from "../src/config/course-run.mjs";
import { fileURLToPath } from "node:url";

function runFixture(script, filename, content, extraFiles = {}, env = {}) {
  const directory = mkdtempSync(join(tmpdir(), "burningsuit-gate-test-"));
  try {
    for (const [name, text] of Object.entries({ [filename]: content, ...extraFiles })) {
      writeFileSync(join(directory, name), text);
    }
    return spawnSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}`, import.meta.url)), directory], { encoding: "utf8", env: { ...process.env, ...env } });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const value of ["false", '"true"', "null"]) {
  test(`closed or invalid permission gate (${value}) rejects named source without disclosing it`, () => {
    const result = runFixture("check-content.mjs", "fixture.mdx", `---\nnamePublished: ${value}\nnamed:\n  client: SYNTHETIC_PRIVATE_VALUE\n---\n`);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /SYNTHETIC_PRIVATE_VALUE/);
  });
}
test("anonymised source passes", () => {
  assert.equal(runFixture("check-content.mjs", "fixture.mdx", "---\nnamePublished: false\n---\n").status, 0);
});
test("explicitly open permission gate accepts a named block", () => {
  assert.equal(runFixture("check-content.mjs", "fixture.mdx", "---\nnamePublished: true\nnamed:\n  client: Synthetic example\n  quote: Example text\n  cite: Example author\n---\n").status, 0);
});
// A minimal released build: an indexable homepage, robots allowing crawlers and a sitemap listing the homepage.
const page = (head = "") => `<head>${head || '<link rel="canonical" href="https://burningsuit.co.uk/">'}</head><body></body>`;
const released = (extra = {}) => ({
  "robots.txt": "User-agent: *\nAllow: /\n\nSitemap: https://burningsuit.co.uk/sitemap-index.xml\n",
  "sitemap-index.xml": "<sitemapindex><sitemap><loc>https://burningsuit.co.uk/sitemap-0.xml</loc></sitemap></sitemapindex>",
  "sitemap-0.xml": "<urlset><url><loc>https://burningsuit.co.uk/</loc></url></urlset>",
  ...extra,
});
const release = (home, extra) => runFixture("check-release.mjs", "index.html", home, released(extra)).status;
test("a fully released build passes the release check", () => {
  assert.equal(release(page()), 0);
});
test("a noindex homepage blocks release", () => {
  assert.equal(release(page('<meta content="noindex, nofollow" name="robots">')), 1);
});
test("a page without a canonical link blocks release", () => {
  assert.equal(release("<head></head>"), 1);
});
test("a noindex page outside the deliberate few blocks release", () => {
  assert.equal(release(page(), { "other.html": '<meta name="robots" content="noindex">' }), 1);
});
test("the 404 page must stay noindex", () => {
  assert.equal(release(page(), { "404.html": '<link rel="canonical" href="https://burningsuit.co.uk/404">' }), 1);
  assert.equal(release(page(), { "404.html": '<meta name="robots" content="noindex, nofollow">' }), 0);
});
test("robots.txt disallowing the site blocks release", () => {
  assert.equal(release(page(), { "robots.txt": "User-agent: *\nDisallow: /\n\nSitemap: https://burningsuit.co.uk/sitemap-index.xml\n" }), 1);
});
test("a missing robots.txt or sitemap blocks release", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", page(), { "sitemap-index.xml": "<sitemapindex></sitemapindex>" }).status, 1);
  assert.equal(release(page(), { "sitemap-index.xml": "<sitemapindex><sitemap><loc>https://burningsuit.co.uk/sitemap-9.xml</loc></sitemap></sitemapindex>" }), 1);
});
test("a sitemap that lists a noindex page blocks release", () => {
  assert.equal(release(page(), { "404.html": '<meta name="robots" content="noindex">', "sitemap-0.xml": "<urlset><url><loc>https://burningsuit.co.uk/</loc></url><url><loc>https://burningsuit.co.uk/404.html</loc></url></urlset>" }), 1);
});
test("a form without a delivery endpoint blocks release", () => {
  assert.equal(release(page() + '<form method="post"></form>'), 1);
});
test("a form posting to an HTTPS endpoint does not block release", () => {
  assert.equal(release(page() + '<form method="post" action="https://forms.example/submit"></form>'), 0);
});
test("a data-action attribute is not a delivery endpoint", () => {
  assert.equal(release(page() + '<form method="post" data-action="https://forms.example/submit"></form>'), 1);
});
test("CSP form-action follows the configured endpoint", () => {
  assert.equal(formActionFor(null), "'none'");
  assert.equal(formActionFor("/enquiry/"), "'self'");
  assert.equal(formActionFor("https://forms.example/submit?x=1"), "https://forms.example 'self'");
  assert.throws(() => formActionFor("http://forms.example/submit"));
  assert.throws(() => formActionFor("//forms.example/submit"));
});
test("the release check blocks a course run still open after it has ended, with a fixed message", { skip: !RUN.open && "the committed run is not open" }, () => {
  const run = (now) => runFixture("check-release.mjs", "index.html", page(), released(), { BURNINGSUIT_NOW: now });
  const late = run(new Date(RUN.endsAt + 60_000).toISOString());
  assert.equal(late.status, 1);
  assert.match(late.stderr, /the 101's course run is still "open" but has ended: mark it "past" \(or move its date\) in src\/config\/course-run\.mjs/);
  assert.equal(run(new Date(RUN.endsAt - 60_000).toISOString()).status, 0);
});
