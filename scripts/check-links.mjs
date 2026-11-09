import { LinkChecker, LinkState } from "linkinator";
import { checkFragments } from "./check-fragments.mjs";

// BURNINGSUIT_LINK_PORT pins the checker's own static server, falling back to BURNINGSUIT_TEST_PORT; unset, Linkinator picks a free port.
const portSetting = process.env.BURNINGSUIT_LINK_PORT || process.env.BURNINGSUIT_TEST_PORT;
const port = portSetting ? Number(portSetting) : undefined;
const result = await new LinkChecker().check({
  path: "dist",
  ...(port ? { port } : {}),
  recurse: true,
  linksToSkip: async (link) => {
    const url = new URL(link);
    return url.protocol === "mailto:" || (/^https?:$/.test(url.protocol) && url.hostname !== "localhost");
  },
});
for (const link of result.links.filter((link) => link.state === LinkState.BROKEN)) {
  console.error(`Broken link: ${link.url} (from ${link.parent ?? "entry"})`);
}
// Linkinator checks that each linked page exists, not that its #fragment does (checkFragments is off), so check those against the build.
const fragments = checkFragments("dist");
for (const line of fragments.problems) console.error(`Broken fragment: ${line}`);
const passed = result.passed && fragments.checked > 0 && fragments.problems.length === 0;
console.log(`Link check: ${passed ? "passed" : "failed"} (${result.links.length} links, ${fragments.checked} with fragments).`);
if (!passed) process.exit(1);
