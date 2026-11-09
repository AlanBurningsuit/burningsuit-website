import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/check-copy.mjs", import.meta.url));
const run = (brandDir) => spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, BURNINGSUIT_BRAND_DIR: brandDir } });

test("copy lint errors fail the check", () => {
  const brand = mkdtempSync(join(tmpdir(), "burningsuit-copy-test-"));
  try {
    mkdirSync(join(brand, "scripts"));
    writeFileSync(join(brand, "scripts/lint-copy.mjs"), 'console.log("fixture: 1 error(s)"); process.exit(1);\n');
    const result = run(brand);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Copy lint failed/);
  } finally {
    rmSync(brand, { recursive: true, force: true });
  }
});

test("a missing brand checkout skips the lint loudly and passes", () => {
  const brand = join(tmpdir(), "burningsuit-copy-test-absent");
  rmSync(brand, { recursive: true, force: true });
  const result = run(brand);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Copy lint skipped: no brand checkout/);
});
