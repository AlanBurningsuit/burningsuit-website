// Submits the live sitemap's URLs to IndexNow after a production deploy (run by deploy.yml's indexnow job).
// It first checks that the published key file matches, so a deploy that dropped it never submits.
// Usage: node scripts/indexnow.mjs [--dry-run]
import { INDEXNOW_KEY } from "../src/config/indexnow.mjs";

const site = "https://burningsuit.co.uk";
const dryRun = process.argv.includes("--dry-run");
const keyLocation = `${site}/${INDEXNOW_KEY}.txt`;

const fetchText = async (url) => {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

const published = (await fetchText(keyLocation)).trim();
if (published !== INDEXNOW_KEY) throw new Error("The published IndexNow key file does not match the configured key.");
const index = locs(await fetchText(`${site}/sitemap-index.xml`));
const urlList = (await Promise.all(index.map(async (url) => locs(await fetchText(url))))).flat();
if (!urlList.length || urlList.some((url) => !url.startsWith(`${site}/`))) throw new Error("The sitemap gave no URLs, or a URL off the site.");

const body = { host: new URL(site).host, key: INDEXNOW_KEY, keyLocation, urlList };
if (dryRun) {
  console.log(`Dry run: would submit ${urlList.length} URLs.`);
  process.exit(0);
}
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
// 200 and 202 both mean accepted (202: key validation pending).
if (response.status !== 200 && response.status !== 202) throw new Error(`IndexNow returned ${response.status}`);
console.log(`IndexNow accepted ${urlList.length} URLs (${response.status}).`);
