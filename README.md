# burningsuit.co.uk

A static Astro rebuild in progress. The homepage and Agentic development for Power BI 101 page implement the agreed notebook direction; the rest of the site remains a compatibility shell. Nothing is approved for publication.

## Develop and check

Use Node 22.20+ and LF line endings. Install with `npm ci`, run `npm run dev`, and validate with:

```bash
npm run gate
npm run test:functional
```

The gate checks canonical brand parity, Astro types, source permissions, a static build, byte budgets, links, metadata, redirects and reserved anchors. Functional checks cover CSP, keyboard access, small screens, no-JavaScript behaviour, source permissions and the release block. Checks establish technical behaviour, not editorial approval.

Tests serve the existing `dist/`; build first. Each Playwright run chooses a fresh port and refuses to reuse an existing listener. Use a separate checkout and fresh build for independent tests; never overwrite another review's build or stop its server. Leave the priced review at `127.0.0.1:4400` alone.

`npm run test:lh` and `npm run test:lh:mobile` audit both built pages for performance and accessibility. If Chrome is not on PATH, set `CHROME_PATH` to the installed browser executable. Functional tests attach full-page captures at 1366px and 390px for visual review; these are review artifacts, not approved screenshot baselines.

The link gate permits only the explicit future destinations in `src/config/pending-routes.mjs` while they have no built HTML. They currently return 404: `/training/`, `/training/power-bi-fundamentals/` and `/training/how-i-train/`. Remove each reservation and its 404 test when building that page. Other broken internal links still fail. `/contact/` retains its existing redirect to the About placeholder; enquiry links preserve their proposed course context in source, but the form is not built. Email remains the working fallback.

## What remains

- `src/pages/index.astro` and `src/pages/training/agentic-development-for-power-bi.astro`: bespoke static pages with shared masthead, footer and contact band in `src/components/`. `BaseLayout.astro` keeps every page noindex; other routes retain their placeholders. No analytics runtime, forms or client rendering.
- `src/config/compatibility.mjs`: existing redirect destinations and route/anchor reservations. These placeholders preserve addresses, not the old page content; the list does not prescribe the new page hierarchy. Restore meaningful destinations before release, including the cited archive article.
- `content/`: the five original MDX entries and original privacy/archive page sources, preserved byte-for-byte for reference and outside the build. They are not current offer authority or automatically cleared copy. The content check still rejects a named frontmatter block unless its publication gate is explicitly open; actual permission remains in the private ledger.
- `src/styles/brand.css`: canonical brand tokens, copied unchanged from the brand repo. Change shared identity there first. `app.css` defines shared page furniture; `home.css` and `course.css` hold page compositions. Headings keep sentence case. The portrait uses `astro:assets` and the committed photo derivative; generated responsive images belong only in the build output.
- `src/components/seo/Schema.astro`: the retained JSON-LD emitter, with script-breakout escaping. Placeholder pages emit no schema or canonical links.
- Photos, diagrams, logos and social assets remain available. Sources are not automatically rendered.

The shared analytics configuration remains available for the eventual site and its CSP, but the shell loads no tracker. Restore a working privacy notice and opt-out if analytics is reintroduced.

## Asset tools

`npm run prep:images` prepares committed photo derivatives; `node diagrams/export.mjs` exports the diagram sources using draw.io desktop and `xvfb-run` on headless Linux. Both use the brand checkout beside the original Git checkout, including from linked worktrees; `BURNINGSUIT_BRAND_DIR` overrides that location. Missing photo originals leave committed derivatives available. Commit regenerated assets and use their actual dimensions in future markup.

## Publication and safeguards

All shell pages are noindex; `robots.txt` disallows crawling. `npm run check:release` deliberately fails for the shell and is required by the production workflow before artifact upload. This is not a release candidate. Restore indexing, sitemap, substantive content, privacy controls and appropriate checks before a release is considered.

`main` publishes to GitHub Pages; `dev` is integration. Branches and Netlify previews can be public. Commit locally and ask before every push; a push, merge or deployment needs its existing authorization. Keep the local push-readiness hook enabled. The production workflow validates and tests one artifact before publishing it; the Netlify preview stays hard-noindexed. GitHub Pages cannot enforce HSTS or frame-ancestors through a meta CSP.

Local `AGENTS.md`, hooks and the private `design/` symlink remain untracked. Back up local instructions before a checkout/rebase over history that tracked them. Current website decisions live in the private brief, course scope in Practice, and voice/identity in the brand repo. Earlier implementations remain in git history; they are not current requirements.
