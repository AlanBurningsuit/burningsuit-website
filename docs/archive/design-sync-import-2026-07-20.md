# Design-sync import — 20 July 2026

> Historical record of the styles-only import and its original rebuild recipe. The runtime and footer warnings below describe the July snapshot and have been superseded by the current [design conventions](../../.design-sync/conventions.md). This record does not claim that a new bundle has been built, tested or uploaded.

- This repo is an Astro 6 static site with NO React component library, so the sync is a
  deliberate off-script **styles-only** import (Alan's call, 2026-07-20): tokens + compiled
  CSS + fonts, no `_ds_bundle.js`, no component cards, no `_ds_sync.json` anchor. A re-sync
  simply rebuilds `ds-bundle/` and re-uploads everything (it's small).
- Rebuild recipe (`ds-bundle/` is gitignored build output):
  1. `npm run build` (or reuse a fresh `dist/`).
  2. `_ds_bundle.css` = copy of `dist/_astro/BaseLayout.*.css` (hash changes per build).
  3. `fonts/*.woff2` = copy of `dist/_astro/fonts/*.woff2`.
  4. `fonts/fonts.css` = the `@font-face` rules AND the three `:root{--font-*}` blocks
     grepped out of `dist/index.html` (Astro's Fonts API injects them into HTML, not CSS),
     with `/_astro/fonts/` rewritten to `./`.
  5. `tokens/tokens.css` = copy of `src/styles/tokens.css` (reference doc only — its
     `@theme` blocks are Tailwind-v4 syntax; the compiled values live in `_ds_bundle.css`).
  6. `styles.css` imports fonts.css then _ds_bundle.css; `README.md` = conventions.md +
     provenance footer (update the commit stamp).
- Verified locally by rendering `ds-bundle/_local-test.html` (never uploaded) in the
  browser: fonts, panel, cta, tokens all correct on first try.
- Traps encoded in conventions.md: `.js` on `<html>` hides reveal-gated content;
  `.cta-footer` is a fixed basement.
