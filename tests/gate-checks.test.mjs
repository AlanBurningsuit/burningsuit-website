// The gate's own checks can fail: each one is shown rejecting a deliberate defect in a throwaway fixture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkFragments } from "../scripts/check-fragments.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
const withDir = (prefix, fn) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
// Git exports its variables to hooks (the push hook runs these tests); fixture repositories must not inherit them.
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));

// ---- Fragments ---------------------------------------------------------------------------------------------------------

test("the fragment check passes resolvable fragments and fails one with no matching id", () => withDir("bs-fragments-", (dir) => {
  const dist = join(dir, "dist");
  write(join(dist, "index.html"), '<a href="#main">Skip</a><main id="main"><a href="/training/#coaching">Coaching</a><a href="/old/#coaching">Old</a><a href="#top">Top</a><a href="https://example.com/#x">Out</a></main>');
  write(join(dist, "training/index.html"), '<h2 id="coaching">Coaching</h2><a href="/#main">Home</a>');
  write(join(dist, "old/index.html"), '<meta http-equiv="refresh" content="0;url=/training/">');
  assert.deepEqual(checkFragments(dist), { checked: 5, problems: [] });

  write(join(dist, "training/index.html"), '<h2 id="coaches">Coaching</h2><a href="/#main">Home</a>');
  const { problems } = checkFragments(dist);
  assert.equal(problems.length, 2, "both the direct link and the link through the redirect stub fail");
  assert.match(problems[0], /^index\.html -> \/training\/#coaching: no element with id "coaching" in training\/index\.html$/);
}));

// ---- Brand colours -----------------------------------------------------------------------------------------------------

const brandCheck = (root) => spawnSync(process.execPath, [join(repo, "scripts/check-brand.mjs")], { cwd: root, encoding: "utf8", env: { ...process.env, BURNINGSUIT_BRAND_DIR: join(root, "no-brand-checkout") } });

test("the brand check fails hex and functional colour literals that brand.css doesn't define", () => withDir("bs-brand-", (root) => {
  write(join(root, "src/styles/brand.css"), ":root {\n  --fg: #d3c6aa;\n  --line: rgb(211 198 170 / 0.12);\n}\n");
  const page = join(root, "src/styles/page.css");
  write(page, ".a { color: var(--fg); border-color: rgb(211 198 170 / .12); }\n.b { color: rgba(var(--x), .5); }\n/* rgb(1 2 3) in a comment */\n");
  assert.equal(brandCheck(root).status, 0, "brand tokens, var() arguments and comments pass");
  for (const literal of ["#123456", "rgb(1 2 3)", "rgba(0, 0, 0, 0.5)", "hsl(120deg 50% 50%)", "oklch(70% 0.1 150)"]) {
    write(page, `.a {\n  color: ${literal};\n}\n`);
    const result = brandCheck(root);
    assert.equal(result.status, 1, literal);
    assert.match(result.stderr, /src\/styles\/page\.css:2 {2}.+ is not a brand\.css colour/, literal);
  }
}));

// ---- Push hook ---------------------------------------------------------------------------------------------------------

test("the push hook refuses a dirty tree or a ref other than HEAD, and runs the checks only on a clean HEAD", () => withDir("bs-hook-", (dir) => {
  const git = (...args) => execFileSync("git", args, { cwd: dir, env: cleanEnv, encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");
  copyFileSync(join(repo, "scripts/hooks/pre-push"), join(dir, "pre-push"));
  write(join(dir, "file.txt"), "one\n");
  git("add", ".");
  git("commit", "-qm", "one");
  // A stand-in npm records what the hook would run, so the test never runs the real gate.
  const bin = join(dir, "bin");
  write(join(bin, "npm"), `#!/bin/sh\necho "$@" >> "${join(dir, "npm.log")}"\n`);
  chmodSync(join(bin, "npm"), 0o755);
  const head = git("rev-parse", "HEAD");
  const hook = (refs) => spawnSync("sh", ["pre-push"], { cwd: dir, encoding: "utf8", input: refs, env: { ...cleanEnv, PATH: `${bin}:${process.env.PATH}` } });
  const ran = () => { try { return readFileSync(join(dir, "npm.log"), "utf8"); } catch { return ""; } };

  write(join(dir, "file.txt"), "two\n");
  let result = hook(`refs/heads/dev ${head} refs/heads/dev ${"0".repeat(40)}\n`);
  assert.equal(result.status, 1, "an unstaged change is refused");
  assert.match(result.stderr, /uncommitted changes/);
  git("add", "file.txt");
  assert.equal(hook(`refs/heads/dev ${head} refs/heads/dev ${"0".repeat(40)}\n`).status, 1, "a staged change is refused");
  assert.equal(ran(), "", "nothing ran while the tree was dirty");

  git("commit", "-qm", "two");
  result = hook(`refs/heads/old ${head} refs/heads/old ${"0".repeat(40)}\n`);
  assert.equal(result.status, 1, "a ref other than the checked-out commit is refused");
  assert.match(result.stderr, /not the checked-out commit/);

  write(join(dir, "untracked.txt"), "ignored by the rule\n");
  result = hook(`refs/heads/dev ${git("rev-parse", "HEAD")} refs/heads/main ${"0".repeat(40)}\n`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(ran().trim().split("\n"), ["run --silent gate", "run --silent test:functional", "run --silent check:release"]);
}));
