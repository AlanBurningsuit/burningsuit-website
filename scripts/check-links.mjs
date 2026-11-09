import { LinkChecker, LinkState } from "linkinator";

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
console.log(`Link check: ${result.passed ? "passed" : "failed"}.`);
if (!result.passed) process.exit(1);
