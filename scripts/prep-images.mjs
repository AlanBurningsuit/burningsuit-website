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
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = (p) => join(root, "resources/photos", p);
const to = (p) => join(root, "src/assets/photos", p);

// [source, output, maxWidth] — maxWidth = the largest the layout ever renders.
const jobs = [
  ["DSC08670-Edit.jpg", "DSC08670-Edit.jpg", 1000], // hero portrait (4:5, ~40vw right column)
  ["DSC09119-2-Edit-Edit.jpg", "DSC09119-2-Edit-Edit.jpg", 1600], // material photo band
  ["DSC09290-Edit.jpg", "DSC09290-Edit.jpg", 900], // about portrait (~45vw)
  ["DSC09247-Edit.jpg", "DSC09247-Edit.jpg", 384], // face chip (2× of 192px)
];

for (const [src, out, width] of jobs) {
  const info = await sharp(from(src))
    .rotate() // respect EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(to(out));
  console.log(`${out}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}
