# Styles-only design import

The 20 July 2026 import deliberately shipped compiled styles, tokens and fonts without a component bundle or runtime. Preserve that choice and the existing project identity in `config.json`. The [original import record](../docs/archive/design-sync-import-2026-07-20.md) retains its provenance, verification and historical recipe.

The current site source is the authority for a fresh export: `src/styles/tokens.css`, `src/styles/app.css`, `src/layouts/BaseLayout.astro` and `src/scripts/enhance.ts`. The [design conventions](conventions.md) explain how the styles-only snapshot differs from the running site. The ignored `ds-bundle/` is generated output; an existing bundle may predate current source.

When preparing another import:

1. Run `npm run build` successfully and collect the emitted CSS referenced by the built page, rather than assuming a fixed hashed filename.
2. Include the emitted font files and their generated `@font-face` and `--font-*` declarations; rewrite asset URLs to the bundle's local paths.
3. Include `src/styles/tokens.css` as a reference. Its Tailwind `@theme` declarations require compilation; the emitted CSS supplies the browser-ready styles.
4. Make `styles.css` load the fonts and compiled styles. Include `conventions.md` and the source commit in the bundle README.
5. Render representative static markup with the bundle and verify fonts, panels, controls and readable content at desktop and phone widths. The bundle does not include the site's enhancement module, so leave `html.js` unset.

A source tidy-up does not update or verify the remote imported design. Record the source commit and actual validation when another import is performed.
