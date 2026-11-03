// Source material remains private-by-default even while it is not rendered.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const directory = process.argv[2] ?? "content";
let checked = 0;
let failed = false;
for (const name of readdirSync(directory, { recursive: true }).filter((name) => name.endsWith(".mdx"))) {
  try {
    const text = readFileSync(join(directory, name), "utf8");
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) throw new Error();
    const data = parse(frontmatter[1]);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    if (data.namePublished !== undefined && typeof data.namePublished !== "boolean") throw new Error();
    if (data.named !== undefined && data.namePublished !== true) throw new Error();
    if (data.named !== undefined && (!data.named || typeof data.named !== "object" ||
      ["client", "quote", "cite"].some((key) => typeof data.named[key] !== "string"))) throw new Error();
    checked++;
  } catch {
    // Do not print the source or parser error: either could disclose a name.
    console.error(`Content permission/frontmatter check failed: ${name}`);
    failed = true;
  }
}
if (!checked && !failed) {
  console.error("Content check found no source entries.");
  failed = true;
}
if (failed) process.exit(1);
console.log(`Content permission check passed (${checked} source entries).`);
