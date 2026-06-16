/**
 * Renders design/v2/font-specimen.html and screenshots it for Alan to PICK the
 * v2 display + mono faces from (plan task A — "chosen from a rendered screenshot
 * test, not a shortlist"). Captures the full comparison at desktop + 390px, and
 * each candidate card on its own at desktop. Output: design/v2/specimen-shots/.
 *
 * Fonts load from their pinned providers (Google + Fontsource via jsDelivr), so
 * this needs network. Run: node scripts/shoot-fonts.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "design/v2/specimen-shots");
await mkdir(OUT, { recursive: true });
const url = pathToFileURL(join(root, "design/v2/font-specimen.html")).href;

const cards = ["hanken", "schibsted", "mona", "bricolage", "instrument", "plex", "commit"];

const browser = await chromium.launch();

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

// full-page comparison at two widths
for (const vp of [
  { w: 1280, h: 900, tag: "desktop" },
  { w: 390, h: 844, tag: "mobile" },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await settle(page);
  await page.screenshot({ path: join(OUT, `specimen-${vp.tag}.png`), fullPage: true });
  console.log(`shot: specimen-${vp.tag}.png`);
  await ctx.close();
}

// each candidate card on its own, desktop width
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await settle(page);
  for (const id of cards) {
    const el = page.locator(`#${id}`);
    await el.screenshot({ path: join(OUT, `card-${id}.png`) });
    console.log(`shot: card-${id}.png`);
  }
  await ctx.close();
}

await browser.close();
console.log("done");
