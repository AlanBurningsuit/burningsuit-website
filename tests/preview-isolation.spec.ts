import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

test("development comparisons are absent from the production artifact and sitemap", () => {
  expect(existsSync("dist/design-preview")).toBe(false);
  const documents: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(html|xml)$/.test(entry.name)) documents.push(path);
    }
  };
  visit("dist");
  expect(documents.length).toBeGreaterThan(10);
  for (const path of documents) {
    expect(readFileSync(path, "utf8"), `${path} must not expose comparison navigation`).not.toContain("/design-preview/");
  }
});
