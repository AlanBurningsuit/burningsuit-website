import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { formActionFor } from "../src/config/enquiry.mjs";
import { fileURLToPath } from "node:url";

function runFixture(script, filename, content, extraFiles = {}) {
  const directory = mkdtempSync(join(tmpdir(), "burningsuit-gate-test-"));
  try {
    for (const [name, text] of Object.entries({ [filename]: content, ...extraFiles })) {
      writeFileSync(join(directory, name), text);
    }
    return spawnSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}`, import.meta.url)), directory], { encoding: "utf8" });
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
test("rebuild marker blocks release even without a robots tag", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", "<body data-rebuild-placeholder></body>").status, 1);
});
test("noindex homepage blocks release even without a rebuild marker", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", '<meta content="noindex, nofollow" name="robots">').status, 1);
});
test("normal indexable homepage passes the rebuild release check", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", '<meta name="robots" content="index, follow">').status, 0);
});
test("remaining placeholder blocks release even when the homepage is finished", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", "<h1>Example</h1>", { "unfinished.html": "<body data-rebuild-placeholder></body>" }).status, 1);
});
test("a form without a delivery endpoint blocks release", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", '<meta name="robots" content="index, follow"><form method="post"></form>').status, 1);
});
test("a form posting to an HTTPS endpoint does not block release", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", '<meta name="robots" content="index, follow"><form method="post" action="https://forms.example/submit"></form>').status, 0);
});
test("a data-action attribute is not a delivery endpoint", () => {
  assert.equal(runFixture("check-release.mjs", "index.html", '<meta name="robots" content="index, follow"><form method="post" data-action="https://forms.example/submit"></form>').status, 1);
});
test("CSP form-action follows the configured endpoint", () => {
  assert.equal(formActionFor(null), "'none'");
  assert.equal(formActionFor("/enquiry/"), "'self'");
  assert.equal(formActionFor("https://forms.example/submit?x=1"), "https://forms.example 'self'");
  assert.throws(() => formActionFor("http://forms.example/submit"));
  assert.throws(() => formActionFor("//forms.example/submit"));
});
