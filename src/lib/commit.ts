import { execSync } from "node:child_process";

/**
 * The short git commit the build was cut from — injected at build time so the
 * footer reads as a changelog and /colophon can name the exact source. Resolved
 * once per build (module top-level runs once under Vite).
 *
 * GitHub Actions checks the repo out with git present, so this resolves there.
 * If git is ever unavailable (a tarball build, a sandbox), it degrades to
 * "dev" rather than failing the build.
 */
export const commitHash: string = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
})();
