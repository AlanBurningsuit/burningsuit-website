# Site utilities

Run these commands from the repository root. The gate and browser checks are described in the root README.

| Utility | Purpose and inputs |
|---|---|
| `npm run prep:images` | Regenerate committed photo derivatives from the local, gitignored `resources/photos/` archive. Skips when the archive is absent. |
| `npm run check:budget` | Check the existing `dist/` against page, font and image byte budgets. Runs automatically at the end of a build. |
| `npm run check:seo` | Validate metadata, structured data, social images and redirect destinations in the existing `dist/`. Runs in `npm run gate`. |
| `npm run render:social` | Regenerate social PNGs in `public/` from the current case-study frontmatter, branding and built fonts. Build first, then rebuild after rendering to include the new PNGs in `dist/`. |
| `node scripts/shoot.mjs` | Capture current pages for human review in the gitignored `design/_astro-shots/` folder. Build first and run `npm run serve`. The optional B5 design reference also needs the local design archive served on port 4322. |

`archive/shoot-fonts.mjs` preserves the earlier font-selection comparison. It requires the local `design/v2/font-specimen.html` archive and network access; it is not part of the site's build or checks.
