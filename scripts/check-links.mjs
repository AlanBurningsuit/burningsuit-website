import { existsSync } from "node:fs";
import { join } from "node:path";
import { LinkChecker, LinkState } from "linkinator";
import { pendingRoutes } from "../src/config/pending-routes.mjs";

const pending = new Set(pendingRoutes.filter((route) => !existsSync(join("dist", route, "index.html"))));
// BURNINGSUIT_LINK_PORT optionally fixes the checker's local server port (isolated test runs); unset, it picks a free one.
const port = process.env.BURNINGSUIT_LINK_PORT ? Number(process.env.BURNINGSUIT_LINK_PORT) : undefined;
const result = await new LinkChecker().check({
  path: "dist",
  ...(port ? { port } : {}),
  recurse: true,
  linksToSkip: async (link) => {
    const url = new URL(link);
    return url.protocol === "mailto:" ||
      (/^https?:$/.test(url.protocol) && url.hostname !== "localhost") ||
      (url.hostname === "localhost" && pending.has(url.pathname));
  },
});
for (const link of result.links.filter((link) => link.state === LinkState.BROKEN)) {
  console.error(`Broken link: ${link.url} (from ${link.parent ?? "entry"})`);
}
console.log(`Link check: ${result.passed ? "passed" : "failed"}; ${pending.size} explicit future routes remain unbuilt.`);
if (!result.passed) process.exit(1);
