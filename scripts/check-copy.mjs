// Copy check: runs the brand repo's copy lint (scripts/lint-copy.mjs) over the
// site's reader-facing source. Lint errors fail; jargon warnings don't.
//
// Like check-brand's sibling comparison, it runs only where the brand checkout
// exists (locally, so the push hook lints every push). CI has no brand
// checkout, so there it says it skipped and passes.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { brandRoot } from "./brand-path.mjs";

const lint = join(brandRoot, "scripts/lint-copy.mjs");
if (!existsSync(lint)) {
  console.log(`Copy lint skipped: no brand checkout at ${brandRoot} (set BURNINGSUIT_BRAND_DIR to run it).`);
  process.exit(0);
}

const result = spawnSync(process.execPath, [lint, "src/pages", "src/content", "src/components", "src/layouts"], { stdio: "inherit" });
if (result.status !== 0) {
  console.error("Copy lint failed: fix the errors above, or mark a deliberate exception with copy-lint-ignore.");
  process.exit(1);
}
console.log("Copy lint passed.");
