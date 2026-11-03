# burningsuit.co.uk

A minimal static Astro rebuild shell. The old page system is removed; the training-led site has not been implemented or approved for publication.

## Develop and check

Use Node 22.20+ and LF line endings. Install with `npm ci`, run `npm run dev`, and validate with:

```bash
npm run gate
npm run test:functional
```

The gate checks canonical brand parity, Astro types, source permissions, a static build, byte budgets, links, metadata, redirects and reserved anchors. Functional checks cover CSP, keyboard access, small screens, no-JavaScript behaviour, source permissions and the release block. Checks establish technical behaviour, not editorial approval.

Tests serve the existing `dist/`; build first. Each Playwright run chooses a fresh port and refuses to reuse an existing listener. Use a separate checkout and fresh build for independent tests; never overwrite another review's build or stop its server. Leave the priced review at `127.0.0.1:4400` alone.

`npm run test:lh` and `npm run test:lh:mobile` audit the existing build for performance and accessibility. If Chrome is not on PATH, set `CHROME_PATH` to the installed browser executable. Page-specific screenshot baselines will be added when there is a design to review.

## What remains

- `src/pages/` and `src/layouts/BaseLayout.astro`: noindex placeholders and a 404 page, with no analytics runtime, forms, navigation, animation or content components.
- `src/config/compatibility.mjs`: existing redirect destinations and route/anchor reservations. These placeholders preserve addresses, not the old page content; the list does not prescribe the new page hierarchy. Restore meaningful destinations before release, including the cited archive article.
- `content/`: the five original MDX entries and original privacy/archive page sources, preserved byte-for-byte for reference and outside the build. They are not current offer authority or automatically cleared copy. The content check still rejects a named frontmatter block unless its publication gate is explicitly open; actual permission remains in the private ledger.
- `src/styles/brand.css`: canonical brand tokens, copied unchanged from the brand repo. Change shared identity there first. Website styles now contain only basic type, spacing and accessible focus behaviour.
- `src/components/seo/Schema.astro`: the retained JSON-LD emitter, with script-breakout escaping. Placeholder pages emit no schema or canonical links.
- Photos, diagrams, logos and social assets remain available. Sources are not automatically rendered.

The shared analytics configuration remains available for the eventual site and its CSP, but the shell loads no tracker. Restore a working privacy notice and opt-out if analytics is reintroduced.

## Asset tools

`npm run prep:images` prepares committed photo derivatives; `node diagrams/export.mjs` exports the diagram sources using draw.io desktop and `xvfb-run` on headless Linux. Both use the brand checkout beside the original Git checkout, including from linked worktrees; `BURNINGSUIT_BRAND_DIR` overrides that location. Missing photo originals leave committed derivatives available. Commit regenerated assets and use their actual dimensions in future markup.

## Publication and safeguards

All shell pages are noindex; `robots.txt` disallows crawling. `npm run check:release` deliberately fails for the shell and is required by the production workflow before artifact upload. This is not a release candidate. Restore indexing, sitemap, substantive content, privacy controls and appropriate checks before a release is considered.

`main` publishes to GitHub Pages; `dev` is integration. Branches and Netlify previews can be public. Commit locally and ask before every push; a push, merge or deployment needs its existing authorization. Keep the local push-readiness hook enabled. The production workflow validates and tests one artifact before publishing it; the Netlify preview stays hard-noindexed. GitHub Pages cannot enforce HSTS or frame-ancestors through a meta CSP.

Local `AGENTS.md`, hooks and the private `design/` symlink remain untracked. Back up local instructions before a checkout/rebase over history that tracked them. Current website decisions live in the private brief, course scope in Practice, and voice/identity in the brand repo. Earlier implementations remain in git history; they are not current requirements.
