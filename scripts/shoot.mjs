/**
 * QA / fidelity capture (not a gate). Screenshots the three built Astro pages
 * and the pinned B5 source for side-by-side human sign-off. Requires two
 * http-servers already running:
 *   - :4321  serving dist/                  (the Astro build)
 *   - :4322  serving the repo root          (so B5's ../resources resolves)
 *
 * Clock is frozen and motion reduced so reveals settle and the live clock can't
 * jitter the frame; the page is scrolled top-to-bottom first so every
 * IntersectionObserver reveal has fired before the full-page capture.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const OUT = "design/_astro-shots";
await mkdir(OUT, { recursive: true });

const targets = [
  { url: "http://localhost:4321/", name: "home" },
  { url: "http://localhost:4321/ai-fit-for-teams/", name: "ai-fit" },
  { url: "http://localhost:4321/power-bi/", name: "power-bi" },
  { url: "http://localhost:4322/design/concept-b5-alive.html", name: "b5-home" },
];
const viewports = [
  { width: 1200, height: 950, tag: "desktop" },
  { width: 390, height: 844, tag: "mobile" },
];

const browser = await chromium.launch();
for (const t of targets) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date("2026-06-15T10:30:00") });
    await page.goto(t.url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // fire every reveal, then return to the top
    await page.evaluate(async () => {
      const step = Math.round(innerHeight * 0.6);
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 140));
      }
      scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 350));
    });
    const file = `${OUT}/${t.name}-${vp.tag}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`shot: ${file}`);
    await ctx.close();
  }
}
await browser.close();
console.log("done");
