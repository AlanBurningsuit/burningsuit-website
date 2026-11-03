import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
let checkout = root;
try {
  // A worktree's common Git directory belongs to the original checkout.
  checkout = dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim());
} catch {
  // Source archives without Git retain the ordinary sibling-repo layout.
}

export const brandRoot = process.env.BURNINGSUIT_BRAND_DIR
  ? resolve(process.env.BURNINGSUIT_BRAND_DIR)
  : resolve(checkout, "../burningsuit-brand");
