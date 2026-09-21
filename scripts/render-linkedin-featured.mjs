/**
 * Social / Open Graph cards, drawn from the field-notebook tokens.
 *
 *   public/og-image.png                  — the site-wide fallback (mark + wordmark on green)
 *   public/social/linkedin-power-bi.png  — /power-bi (its H1 verbatim + a model diagram)
 *   public/social/linkedin-work-<slug>.png — one per `work` entry (its kicker + H1 verbatim
 *                                            + a notebook page stack)
 *   public/social/burningsuit-mark-on-green.png — the Organization logo (400×400)
 *
 * Case-study cards are drawn FROM the study's frontmatter, so the card can't drift from
 * the page. Each study must declare `ogImage: /social/linkedin-work-<slug>.png` — the
 * renderer refuses a mismatch, and check-seo refuses a built page whose og:image asset
 * is missing from dist/. Run `npm run render:social` after `npm run build` (the fonts are
 * read from the built subset) whenever a heading, kicker, or logo changes, then commit
 * the PNGs. LinkedIn caches previews for about a week: re-scrape via the Post Inspector.
 */
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "social");
const workDir = path.join(root, "src", "content", "work");
const width = 1200;
const height = 627;

const palette = {
  bg: "#272e33",
  deep: "#1c2226",
  fg: "#d3c6aa",
  paper: "#f1ecd9",
  paperEdge: "#cfc6a8",
  ink: "#3a444a",
  inkSoft: "#4d5a61",
  amber: "#e69875",
  spark: "#d90148",
};

async function embeddedFont(family, weight) {
  // Astro 6.4 writes the subset fonts under hashed names; the only reliable
  // map from family + weight to file is the @font-face rule the build emits.
  const html = await readFile(path.join(root, "dist", "index.html"), "utf8").catch(() => {
    throw new Error("dist/index.html not found. Run npm run build once, then retry.");
  });
  const rule = [...html.matchAll(/@font-face\{([^}]*)\}/g)]
    .map((m) => m[1])
    .find((r) => r.includes(`font-family:"${family}`) && r.includes(`font-weight:${weight}`) && r.includes("url("));
  const file = rule && rule.match(/url\("?([^")]+\.woff2)"?\)/)?.[1];
  if (!file) {
    throw new Error(`No built @font-face for ${family} ${weight}. Run npm run build once, then retry.`);
  }
  return (await readFile(path.join(root, "dist", file))).toString("base64");
}

function paperPanel({ x, y, w, h, rows = 4, large = false, blank = false }) {
  const left = x + (large ? 24 : 16);
  const top = y + (large ? 34 : 24);
  const lineWidth = w - (large ? 48 : 32);
  const spacing = large ? 22 : 15;
  const lines = blank
    ? ""
    : Array.from({ length: rows }, (_, index) => {
        const lineY = top + index * spacing;
        const short = index === rows - 1 ? lineWidth * 0.64 : lineWidth;
        return `<circle cx="${left}" cy="${lineY}" r="2.5" fill="${palette.ink}"/>
      <line x1="${left + 12}" y1="${lineY}" x2="${left + 12 + short}" y2="${lineY}" stroke="${palette.inkSoft}" stroke-width="2"/>`;
      }).join("");
  const heading = blank
    ? ""
    : `<line x1="${left}" y1="${y + 16}" x2="${left + Math.min(52, lineWidth)}" y2="${y + 16}" stroke="${palette.ink}" stroke-width="5"/>`;

  return `<g filter="url(#paper-shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
    ${heading}
    ${lines}
  </g>`;
}

function commonDefs({ mona, commit }) {
  return `<defs>
    <style>
      @font-face { font-family: Mona; src: url(data:font/woff2;base64,${mona}); font-weight: 800; }
      @font-face { font-family: Commit; src: url(data:font/woff2;base64,${commit}); font-weight: 400; }
      .display { font-family: Mona, sans-serif; font-size: 66px; font-weight: 800; letter-spacing: -2.5px; }
      .kicker { font-family: Commit, monospace; font-size: 21px; font-weight: 400; letter-spacing: 2px; }
    </style>
    <pattern id="dot-grid" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.35" fill="${palette.paperEdge}" opacity="0.34"/>
    </pattern>
    <filter id="paper-shadow" x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="7" dy="9" stdDeviation="0" flood-color="${palette.deep}" flood-opacity="0.78"/>
    </filter>
  </defs>`;
}

function shell(defs, logo, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${defs}
    <rect width="${width}" height="${height}" fill="${palette.bg}"/>
    ${body}
    <image href="data:image/svg+xml;base64,${logo}" x="968" y="548" width="166" height="31"/>
  </svg>`;
}

function markAsset(mark) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${palette.bg}"/>
    <image href="data:image/svg+xml;base64,${mark}" x="56" y="56" width="288" height="288"/>
  </svg>`;
}

/** The site-wide fallback: the on-green logo (flame mark + wordmark), flat, 1200×630. */
function defaultCard(logo) {
  // The wordmark SVG is 285.1 × 51.57; 640 wide keeps the mark legible at
  // LinkedIn's smallest preview while leaving the card unmistakably flat.
  const w = 640;
  const h = (w * 51.57) / 285.1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${palette.bg}"/>
    <image href="data:image/svg+xml;base64,${logo}" x="${(1200 - w) / 2}" y="${(630 - h) / 2}" width="${w}" height="${h}"/>
  </svg>`;
}

function powerBiCard(defs, logo) {
  const connectors = `<g fill="none" stroke="${palette.fg}" stroke-width="2.5" opacity="0.82">
    <path d="M810 310H840M990 310H1020M915 230V195"/>
    <circle cx="825" cy="310" r="6" fill="${palette.bg}"/>
    <circle cx="1005" cy="310" r="6" fill="${palette.bg}"/>
  </g>`;

  const model = `<g>
    <rect x="690" y="112" width="440" height="370" fill="url(#dot-grid)"/>
    ${connectors}
    ${paperPanel({ x: 840, y: 230, w: 150, h: 170, rows: 5, large: true })}
    ${paperPanel({ x: 715, y: 265, w: 95, h: 90, rows: 2 })}
    ${paperPanel({ x: 1020, y: 260, w: 95, h: 95, rows: 2 })}
    ${paperPanel({ x: 870, y: 120, w: 95, h: 75, rows: 1 })}
    <path d="M897 391l7 7 13-16" fill="none" stroke="${palette.spark}" stroke-width="5" stroke-linecap="square"/>
  </g>`;

  // The card carries the /power-bi H1 verbatim (two lines; the amber em on
  // "team" mirrors RiseHeading). Re-render whenever that H1 changes.
  const body = `<text x="82" y="296" class="display" style="font-size:56px" fill="${palette.fg}" xml:space="preserve">Working alongside<tspan x="82" dy="66">your Power BI <tspan fill="${palette.amber}">team</tspan>.</tspan></text>
    ${model}`;

  return shell(defs, logo, body);
}

// ---------------------------------------------------------------------------
// Case-study cards
// ---------------------------------------------------------------------------

const escapeXml = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Rough advance widths for Mona Sans 800, as a fraction of the font size. SVG
 * text can't measure itself, so the wrap is estimated and then padded: the
 * text column stops 30px short of the diagram at any of these estimates.
 */
function glyphWidth(ch, size, tracking) {
  let em = 0.58;
  if (/[ijl'.,:;!|]/.test(ch)) em = 0.3;
  else if (/[ftr\s-]/.test(ch)) em = 0.4;
  else if (/[mwMW]/.test(ch)) em = 0.9;
  else if (/[A-Z]/.test(ch)) em = 0.7;
  return em * size + tracking;
}

const textWidth = (s, size, tracking) => [...s].reduce((w, ch) => w + glyphWidth(ch, size, tracking), 0);

/**
 * Wrap the heading (before + em + after, joined) into lines of runs, each run
 * flagged as em or not, so the amber <tspan> mirrors the page H1 exactly.
 */
function wrapHeading(heading, { size, tracking, maxWidth }) {
  const segments = [
    { text: heading.before ?? "", em: false },
    { text: heading.em ?? "", em: true },
    { text: heading.after ?? "", em: false },
  ].filter((s) => s.text);

  // Character stream with an em flag, then split into words on spaces.
  const chars = segments.flatMap((s) => [...s.text].map((ch) => ({ ch, em: s.em })));
  const words = [];
  let current = [];
  for (const c of chars) {
    if (c.ch === " ") {
      if (current.length) words.push(current);
      current = [];
    } else current.push(c);
  }
  if (current.length) words.push(current);

  const wordText = (w) => w.map((c) => c.ch).join("");
  const spaceWidth = glyphWidth(" ", size, tracking);
  const lines = [];
  let line = [];
  let lineWidth = 0;
  for (const word of words) {
    const w = textWidth(wordText(word), size, tracking);
    if (line.length && lineWidth + spaceWidth + w > maxWidth) {
      lines.push(line);
      line = [];
      lineWidth = 0;
    }
    if (line.length) lineWidth += spaceWidth;
    line.push(word);
    lineWidth += w;
  }
  if (line.length) lines.push(line);

  // Collapse each line's chars into em / non-em runs (spaces inherit the
  // flag of the word before them, which never matters visually).
  return lines.map((ws) => {
    const runs = [];
    ws.forEach((word, i) => {
      const cs = i === 0 ? word : [{ ch: " ", em: word[0].em && ws[i - 1].at(-1).em }, ...word];
      for (const c of cs) {
        const last = runs.at(-1);
        if (last && last.em === c.em) last.text += c.ch;
        else runs.push({ text: c.ch, em: c.em });
      }
    });
    return runs;
  });
}

function workCard(defs, logo, study) {
  const size = 52;
  const tracking = -2;
  const lineHeight = 60;
  const left = 82;
  const lines = wrapHeading(study.heading, { size, tracking, maxWidth: 560 });
  if (lines.length > 4) {
    throw new Error(`${study.slug}: heading wraps to ${lines.length} lines; the card fits 4`);
  }

  // Kicker eyebrow, then the H1 block, centred as a unit on the card's middle.
  const kickerGap = 46;
  const blockHeight = kickerGap + lines.length * lineHeight;
  const top = Math.round((height - blockHeight) / 2);
  const kickerY = top + 18;
  const firstBaseline = top + kickerGap + size * 0.78;

  const headingSvg = lines
    .map((runs, i) => {
      const spans = runs
        .map((r) => (r.em ? `<tspan fill="${palette.amber}">${escapeXml(r.text)}</tspan>` : escapeXml(r.text)))
        .join("");
      return `<text x="${left}" y="${firstBaseline + i * lineHeight}" class="display" style="font-size:${size}px;letter-spacing:${tracking}px" fill="${palette.fg}" xml:space="preserve">${spans}</text>`;
    })
    .join("\n");

  // The notebook: a stack of three field-notebook pages on the dot grid, the
  // front one written up and ticked — the same page stack the study's Snapshot
  // and Casefile draw from.
  const notebook = `<g>
    <rect x="690" y="112" width="440" height="370" fill="url(#dot-grid)"/>
    ${paperPanel({ x: 870, y: 150, w: 210, h: 270, blank: true })}
    ${paperPanel({ x: 840, y: 178, w: 210, h: 270, blank: true })}
    ${paperPanel({ x: 810, y: 206, w: 210, h: 270, rows: 7, large: true })}
    <path d="M974 446l9 9 17-20" fill="none" stroke="${palette.spark}" stroke-width="5" stroke-linecap="square"/>
  </g>`;

  const body = `<text x="${left}" y="${kickerY}" class="kicker" fill="${palette.amber}">${escapeXml(study.kicker)}</text>
    ${headingSvg}
    ${notebook}`;

  return shell(defs, logo, body);
}

/** Read each work entry's frontmatter; the filename is the slug (as in the route). */
async function workStudies() {
  const files = (await readdir(workDir)).filter((f) => f.endsWith(".mdx")).sort();
  const studies = [];
  for (const file of files) {
    const source = await readFile(path.join(workDir, file), "utf8");
    const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) throw new Error(`${file}: no frontmatter`);
    const data = parseYaml(fm[1]);
    const slug = file.replace(/\.mdx$/, "");
    const expected = `/social/linkedin-work-${slug}.png`;
    if (data.ogImage !== expected) {
      throw new Error(`${file}: ogImage must be "${expected}" (found ${JSON.stringify(data.ogImage)})`);
    }
    studies.push({ slug, kicker: data.kicker ?? "Case study", heading: data.heading, file: `linkedin-work-${slug}.png` });
  }
  return studies;
}

async function render(filename, svg, expectedWidth = width, expectedHeight = height, dir = outputDir) {
  const pngPath = path.join(dir, filename);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toFile(pngPath);
  const metadata = await sharp(pngPath).metadata();
  if (
    metadata.width !== expectedWidth ||
    metadata.height !== expectedHeight ||
    metadata.format !== "png"
  ) {
    throw new Error(`Invalid output: ${filename}`);
  }
  return pngPath;
}

await mkdir(outputDir, { recursive: true });

const [mona, commit, logoSvg, markSvg, studies] = await Promise.all([
  embeddedFont("Mona Sans", 800),
  embeddedFont("Commit Mono", 400),
  readFile(path.join(root, "public", "logos", "burningsuit-on-green.svg"), "utf8"),
  readFile(path.join(root, "public", "favicon.svg"), "utf8"),
  workStudies(),
]);
const logo = Buffer.from(logoSvg).toString("base64");
const mark = Buffer.from(markSvg).toString("base64");
const defs = commonDefs({ mona, commit });

const outputs = await Promise.all([
  render("og-image.png", defaultCard(logo), 1200, 630, path.join(root, "public")),
  render("linkedin-power-bi.png", powerBiCard(defs, logo)),
  render("burningsuit-mark-on-green.png", markAsset(mark), 400, 400),
  ...studies.map((study) => render(study.file, workCard(defs, logo, study))),
]);

console.log(outputs.join("\n"));
