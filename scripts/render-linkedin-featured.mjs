import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "social");
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

async function embeddedFont(prefix) {
  const fontsDir = path.join(root, ".astro", "fonts");
  const filename = (await readdir(fontsDir)).find((entry) => entry.startsWith(prefix));
  if (!filename) {
    throw new Error(`Missing ${prefix} in .astro/fonts. Run npm run build once, then retry.`);
  }
  return (await readFile(path.join(fontsDir, filename))).toString("base64");
}

function paperPanel({ x, y, w, h, rows = 4, large = false }) {
  const left = x + (large ? 24 : 16);
  const top = y + (large ? 34 : 24);
  const lineWidth = w - (large ? 48 : 32);
  const spacing = large ? 22 : 15;
  const lines = Array.from({ length: rows }, (_, index) => {
    const lineY = top + index * spacing;
    const short = index === rows - 1 ? lineWidth * 0.64 : lineWidth;
    return `<circle cx="${left}" cy="${lineY}" r="2.5" fill="${palette.ink}"/>
      <line x1="${left + 12}" y1="${lineY}" x2="${left + 12 + short}" y2="${lineY}" stroke="${palette.inkSoft}" stroke-width="2"/>`;
  }).join("");

  return `<g filter="url(#paper-shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
    <line x1="${left}" y1="${y + 16}" x2="${left + Math.min(52, lineWidth)}" y2="${y + 16}" stroke="${palette.ink}" stroke-width="5"/>
    ${lines}
  </g>`;
}

function commonDefs(mona) {
  return `<defs>
    <style>
      @font-face { font-family: Mona; src: url(data:font/woff2;base64,${mona}); font-weight: 800; }
      .display { font-family: Mona, sans-serif; font-size: 66px; font-weight: 800; letter-spacing: -2.5px; }
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

  const body = `<text x="82" y="332" class="display" fill="${palette.fg}" xml:space="preserve">done <tspan fill="${palette.amber}">with</tspan> you.</text>
    ${model}`;

  return shell(defs, logo, body);
}

function aiFitCard(defs, logo) {
  const decisionMap = `<g>
    <rect x="70" y="112" width="430" height="370" fill="url(#dot-grid)"/>
    <g fill="none" stroke="${palette.fg}" stroke-width="2.5" opacity="0.82">
      <path d="M210 307H290V172H340M290 307H340M290 307V442H340"/>
      <circle cx="290" cy="307" r="7" fill="${palette.bg}"/>
      <circle cx="328" cy="172" r="5" fill="${palette.bg}"/>
      <circle cx="328" cy="307" r="5" fill="${palette.bg}"/>
      <circle cx="328" cy="442" r="5" fill="${palette.bg}"/>
    </g>
    <g filter="url(#paper-shadow)">
      <rect x="90" y="265" width="120" height="85" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
      <path d="M122 307h52m-14-14 14 14-14 14" fill="none" stroke="${palette.ink}" stroke-width="4"/>
      <rect x="340" y="130" width="120" height="85" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
      <path d="M374 190v-35h34m-12-11 12 11-12 11" fill="none" stroke="${palette.ink}" stroke-width="4"/>
      <rect x="340" y="265" width="120" height="85" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
      <path d="m373 307 16 16 34-40" fill="none" stroke="${palette.amber}" stroke-width="7"/>
      <rect x="340" y="400" width="120" height="85" rx="2" fill="${palette.paper}" stroke="${palette.paperEdge}" stroke-width="2"/>
      <circle cx="393" cy="436" r="20" fill="none" stroke="${palette.ink}" stroke-width="4"/>
      <path d="m408 451 17 17" stroke="${palette.ink}" stroke-width="4"/>
    </g>
    <path d="M342 420v44" stroke="${palette.spark}" stroke-width="4" stroke-dasharray="6 5"/>
  </g>`;

  const body = `${decisionMap}
    <text x="620" y="332" class="display" fill="${palette.fg}" xml:space="preserve">who <tspan fill="${palette.amber}">checks</tspan> it?</text>`;

  return shell(defs, logo, body);
}

async function render(filename, svg, expectedWidth = width, expectedHeight = height) {
  const pngPath = path.join(outputDir, filename);
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

const [mona, logoSvg, markSvg] = await Promise.all([
  embeddedFont("font-mona-800-normal-latin"),
  readFile(path.join(root, "public", "logos", "burningsuit-on-green.svg"), "utf8"),
  readFile(path.join(root, "public", "favicon.svg"), "utf8"),
]);
const logo = Buffer.from(logoSvg).toString("base64");
const mark = Buffer.from(markSvg).toString("base64");
const defs = commonDefs(mona);

const outputs = await Promise.all([
  render("linkedin-power-bi.png", powerBiCard(defs, logo)),
  render("linkedin-ai-fit.png", aiFitCard(defs, logo)),
  render("burningsuit-mark-on-green.png", markAsset(mark), 400, 400),
]);

console.log(outputs.join("\n"));
