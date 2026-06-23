/**
 * Pre-resize the source photos used by the site down to the largest dimension
 * any layout actually needs, writing capped derivatives into src/assets/photos.
 *
 * Why: astro:assets `<Image|Picture widths={[...]}>` emits a full-resolution
 * fallback <img src> in addition to the responsive srcset. The originals in
 * resources/photos are 5–6k px / 3–5 MB, so that fallback blew the <300 KB
 * budget. Capping the SOURCE caps the fallback while leaving the srcset widths
 * untouched. Re-run with `npm run prep:images` if the source photos change.
 *
 * The originals in resources/photos are the archive and are never modified.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = (p) => join(root, "resources/photos", p);
const to = (p) => join(root, "src/assets/photos", p);

// resources/photos is the local-only source archive (gitignored, not in CI). On
// a build where it's absent (Netlify, fresh clone), skip and let the build use
// the committed derivatives already in src/assets/photos.
if (!existsSync(join(root, "resources/photos"))) {
  console.log(
    "[prep-images] resources/photos not present — skipping; using committed src/assets/photos.",
  );
  process.exit(0);
}

// [source, output, maxWidth, crop?] — maxWidth = the largest the layout ever
// renders. Optional `crop` ({left,top,width,height}, in post-rotate source px)
// pre-extracts a region before the downscale — used to frame a landscape
// original into a portrait centred on the subject's eyes.
const jobs = [
  ["DSC08670-Edit.jpg", "DSC08670-Edit.jpg", 1000], // hero portrait (4:5, ~40vw right column)
  ["DSC09119-2-Edit-Edit.jpg", "DSC09119-2-Edit-Edit.jpg", 1600], // material photo band
  ["DSC09290-Edit.jpg", "DSC09290-Edit.jpg", 900], // about portrait (~45vw)
  ["DSC09247-Edit.jpg", "DSC09247-Edit.jpg", 384], // face chip (2× of 192px)
  // /power-bi hero: landscape original (6000×4000) cropped to a 4:5 portrait
  // framed with Alan's face near centre, then downscaled.
  ["DSC09087-Edit.jpg", "DSC09087-Edit.jpg", 800, { left: 2000, top: 0, width: 3200, height: 4000 }],
  // /about — Zelda, the dog: phone portrait (3072×4080) cropped to a 3:2
  // landscape framed on her face + the blanket roll, so it fills the prose
  // content width in the "and the dog" chapter. 1400px covers 42rem at 2×.
  ["PXL_20230723_093559913.PORTRAIT.jpg", "zelda.jpg", 1400, { left: 0, top: 800, width: 3072, height: 2048 }],
];

for (const [src, out, width, crop] of jobs) {
  let pipe = sharp(from(src)).rotate(); // respect EXIF orientation
  if (crop) pipe = pipe.extract(crop);
  const info = await pipe
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(to(out));
  console.log(`${out}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}
