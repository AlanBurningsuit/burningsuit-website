# burningsuit.co.uk

A static Astro rebuild in progress. The homepage implements the approved homepage design, the Power BI with AI agents 101 page the agreed notebook direction, `/power-bi/` the approved consultancy page, and `/about/` the approved About copy; the rest of the site remains a compatibility shell. Nothing is approved for publication.

## Develop and check

Use Node 22.20+ and LF line endings. Install with `npm ci`, run `npm run dev`, and validate with:

```bash
npm run gate
npm run test:functional
```

The gate checks canonical brand parity, Astro types, source permissions, a static build, byte budgets, links, metadata, redirects and reserved anchors. Functional checks cover CSP, keyboard access, small screens, no-JavaScript behaviour, source permissions and the release block. Checks establish technical behaviour, not editorial approval.

Tests serve the existing `dist/`; build first. Each Playwright run chooses a fresh port and refuses to reuse an existing listener. Use a separate checkout and fresh build for independent tests; never overwrite another review's build or stop its server. Leave the priced review at `127.0.0.1:4400` alone.

`npm run test:lh` and `npm run test:lh:mobile` audit the built bespoke pages for performance and accessibility. If Chrome is not on PATH, set `CHROME_PATH` to the installed browser executable. Functional tests attach full-page captures at 1366px and 390px for visual review; these are review artifacts, not approved screenshot baselines.

The link gate permits only the explicit future destinations in `src/config/pending-routes.mjs` while they have no built HTML. They currently return 404: `/training/`, `/training/power-bi-fundamentals/` and `/training/how-i-train/`. Remove each reservation and its 404 test when building that page. Other broken internal links still fail. `/contact/` and the other legacy contact aliases retain their existing redirects to `/about/`, whose closing links offer email, the homepage enquiry form and LinkedIn; About has no form of its own. Homepage enquiry links jump to the inline `#contact` form, which is a plain POST with nothing preselected. Formspark receives it at the public endpoint in `src/config/enquiry.mjs`; there is no API key or browser script. Email remains the fallback.

The form sets distinct `_redirect` and `_error` paths to `/enquiry-received/` and `/enquiry-error/`. `_append=false` prevents personal data entering redirect URLs; never remove it. CSP allows the endpoint's HTTPS origin and `'self'` so Chromium can follow the return redirect. A hidden `_gotcha` checkbox adds Formspark's native honeypot; automatic provider filtering also applies. No CAPTCHA is loaded. The enquiry-specific notice is `/privacy/enquiries/`; the wider `/privacy/` page still needs rebuilding. A null endpoint disables Send and restores `form-action 'none'`. Noindex and the release block remain independent of form readiness.

`tests/enquiry.spec.ts` stubs Formspark's redirect responses to check the no-JavaScript success/error journeys without sending email. Real delivery and spam-rejection checks are deliberate manual verification, not part of routine tests. If the provider itself is unreachable there is no redirect: the browser shows its network error; the homepage's email link remains the alternative. Keep any changed processing facts and retention instructions in the private ops privacy record as well as the notice.

## What remains

- `src/pages/index.astro`, `src/pages/training/agentic-development-for-power-bi.astro`, `src/pages/power-bi.astro` and `src/pages/about.astro`: bespoke static pages with shared masthead, footer and enquiry form in `src/components/`. The consultancy page reuses `course.css` with differences in `consultancy.css`; the raised band shared with the homepage lives in `app.css`. `[...path].astro` skips routes that have a bespoke page, which must keep that route's reserved anchors (`check:seo` enforces them). `BaseLayout.astro` keeps every page noindex; other routes retain their placeholders. No analytics runtime or client rendering; the enquiry form renders and validates without JavaScript and sends once an endpoint is set.
- `src/config/compatibility.mjs`: existing redirect destinations and route/anchor reservations. These placeholders preserve addresses, not the old page content; the list does not prescribe the new page hierarchy. Restore meaningful destinations before release, including the cited archive article.
- `content/`: the five original MDX entries and original privacy/archive page sources, preserved byte-for-byte for reference and outside the build. They are not current offer authority or automatically cleared copy. The content check still rejects a named frontmatter block unless its publication gate is explicitly open; the gate is not permission.
- `src/styles/brand.css`: canonical brand tokens, copied unchanged from the brand repo. Change shared identity there first. `app.css` defines shared page furniture; `home.css`, `course.css`, `consultancy.css`, `about.css` and `enquiry.css` hold page compositions; `tests/about.spec.ts` covers About. Headings keep sentence case. The portrait uses `astro:assets` and the committed photo derivative; generated responsive images belong only in the build output.
- `src/components/seo/Schema.astro`: the retained JSON-LD emitter, with script-breakout escaping. Placeholder pages emit no schema or canonical links.
- Photos, diagrams, logos and social assets remain available. Sources are not automatically rendered.

The shared analytics configuration remains available for the eventual site and its CSP, but the shell loads no tracker. Restore a working privacy notice and opt-out if analytics is reintroduced.

## Asset tools

`npm run prep:images` prepares committed photo derivatives; `node diagrams/export.mjs` exports the diagram sources using draw.io desktop and `xvfb-run` on headless Linux. Both use the brand checkout beside the original Git checkout, including from linked worktrees; `BURNINGSUIT_BRAND_DIR` overrides that location. Missing photo originals leave committed derivatives available. Commit regenerated assets and use their actual dimensions in future markup.

## Publication and safeguards

All shell pages are noindex; `robots.txt` disallows crawling. `npm run check:release` deliberately fails for the shell and is required by the production workflow before artifact upload. This is not a release candidate. Restore indexing, sitemap, substantive content, privacy controls and appropriate checks before a release is considered.

`main` publishes to GitHub Pages; `dev` is integration. Branches and Netlify previews can be public. Commit locally and ask before every push; a push, merge or deployment needs its existing authorization. Keep the local push-readiness hook enabled. The production workflow validates and tests one artifact before publishing it; the Netlify preview stays hard-noindexed. GitHub Pages cannot enforce HSTS or frame-ancestors through a meta CSP.

Local `AGENTS.md`, hooks and the private `design/` symlink remain untracked. Back up local instructions before a checkout/rebase over history that tracked them. Current website decisions live in the private brief, course scope in Practice, and voice/identity in the brand repo. Earlier implementations remain in git history; they are not current requirements.
