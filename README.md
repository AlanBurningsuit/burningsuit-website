# burningsuit.co.uk

The static Astro site for https://burningsuit.co.uk/, deployed to GitHub Pages from `main`. This file says how the code works. Rules for agents (privacy, authority, what needs Alan's approval) are in [CLAUDE.md](CLAUDE.md); what each page is for is in the private ops brief.

## Run

- Node 22.20 or later (`.nvmrc`), LF line endings (`.gitattributes` enforces them: CSP hashes the exact bytes).
- `npm ci`, then `npm run dev`.
- `npm run build` checks content, builds to `dist/` and checks byte budgets.
- Enable the push hook once per clone: `git config core.hooksPath scripts/hooks`.

## Check

```bash
npm run gate
npm run test:functional
```

| Command | What it does |
| --- | --- |
| `npm run gate` | Brand parity, the tracked-file price scan, `astro check`, build, the built-output price scan, links and SEO (reserved routes and anchors, redirects, metadata). |
| `npm run test:functional` | Type-checks the tests, runs `tests/*.test.mjs` with Node, then Playwright against the existing `dist/`. Build first. |
| `npm run check:release` | Run against `dist/`. Fails on a rebuild placeholder, a page noindexed (other than the 404 and the two enquiry results) or without a canonical link, a form with no endpoint, or a `robots.txt` or sitemap that doesn't match the build. |
| `npm run test:lh`, `npm run test:lh:mobile` | Lighthouse over the routes in `scripts/lighthouse-routes.cjs`. Set `CHROME_PATH` if Chrome isn't on `PATH`; set `BURNINGSUIT_LH_URL` to audit a running preview instead. |
| `npm run prep:images` | Rebuilds the committed photo derivatives from the brand checkout's photos. |
| `node diagrams/export.mjs` | Exports `diagrams/*.drawio` to SVG with the draw.io desktop app (`xvfb-run` on headless Linux). |

Things to know:

- **Brand parity is local only.** `check:brand` compares `src/styles/brand.css` with the brand checkout's `brand.css` only when that checkout exists, and skips the comparison silently when it doesn't (as in CI). It always checks that no source file uses a hex colour `brand.css` doesn't define. The brand checkout is found beside the original Git checkout (worktrees included); `BURNINGSUIT_BRAND_DIR` overrides it.
- **Ports.** Playwright and the link checker each pick a free port. `BURNINGSUIT_TEST_PORT` pins Playwright's; `BURNINGSUIT_LINK_PORT` pins the link checker's (falling back to `BURNINGSUIT_TEST_PORT`).
- **Isolation.** Run independent test builds in their own checkout and `dist/`; never overwrite another run's build or stop its server.
- **Analytics in tests.** Tests never contact Umami: `tests/analytics.ts` serves the committed tracker copy in `tests/fixtures/umami/script.js` and fails on any other Umami request. `UMAMI_LIVE=1` loads the real tag (beacons stay blocked). To refresh the copy, replace the code under its header and update the date, version, ETag and hash.
- **Screenshots** that functional tests attach (1366px and 390px) are for review, not approved baselines.
- **Checks prove behaviour, not approval.** Editorial approval is Alan's.

## Map

| Path | Role |
| --- | --- |
| `src/pages/*.astro`, `src/pages/training/*.astro`, `src/pages/privacy/*.astro` | Bespoke static pages: Home, Training, the four course pages, How I train, Consultancy (`power-bi.astro`), About, Contact, the free call (`call.astro`), the privacy notices, the enquiry results and the 404. |
| `src/pages/work/`, `src/pages/writing/`, `src/pages/blog/2021/03/` | The Case studies index and study route, the essay route, and the Roche's Maxim archive article at its original URL. |
| `src/pages/[...path].astro` | Rebuild-era catch-all. It emits no pages now: every route in the manifest has a real page, a collection entry or a 404 reservation. |
| `src/content/work/`, `src/content/writing/` | MDX case studies and articles, with strict schemas in `src/lib/content-schema.ts` (`src/content.config.ts`). |
| `src/layouts/BaseLayout.astro` | Every page's shell: head, CSP, canonical link, JSON-LD, masthead and footer. `placeholder` defaults to true, so every page passes `placeholder={false}`. |
| `src/layouts/CaseStudyLayout.astro`, `EssayLayout.astro` | Layouts for the two MDX collections. |
| `src/components/` | Shared parts: `Masthead`, `Footer`, `TitleBand` (every page's opening), `DecisionHero` (the four course pages' opening), `EnquiryForm`, `PullQuote`, `StudyLinks`, `CourseFigure`, `EssayFigure`, `Chapter` and the case-study kit. `mdx-components.ts` passes the kit to MDX. |
| `src/components/seo/Schema.astro` | The only place JSON-LD is emitted. Builders are in `src/lib/schema.ts`; site identity is in `src/config/site.ts`. |
| `src/config/compatibility.mjs` | Legacy redirects, reserved routes and anchors (checked by `check:seo`), and `reserved404Routes`, the parked study routes that must return a real 404. |
| `src/config/enquiry.mjs` | The Formspark endpoint. A null endpoint disables Send. |
| `src/config/booking.mjs` | The 101's Stripe payment link (used only in the priced build). |
| `src/config/analytics.mjs` | The Umami tag, which also feeds the CSP. |
| `src/config/writing-routes.mjs` | Fixed public URLs for the two articles. |
| `src/config/pending-routes.mjs` | Linked pages not yet built, allowed by the link check until they exist. Empty. |
| `src/config/indexnow.mjs`, `src/integrations/llms-txt.mjs` | IndexNow key; `/llms.txt`, written after the build from indexed pages' titles and descriptions. |
| `src/lib/training-prices.mjs` | Loads and validates the private prices and composes the price wording (see Prices). |
| `src/styles/brand.css` | Brand tokens, copied byte for byte from the brand repo. Change them there first. |
| `src/styles/tokens.css` | Web-only values: surface roles (dark and daylight), the one heading scale, card shadows, motion. Pages never set their own heading sizes. |
| `src/styles/app.css` | Shared furniture: the one `.button`, the closing band, the footer, pull quotes, the sheet edges. |
| `src/styles/<page>.css` | Page compositions. Some pages reuse others' sheets: course pages use `course.css`, and the DAX pages also use `fundamentals.css` and `dax-deep-dive.css`. |
| `content/` | Archived original sources. Outside the build; never current copy. |
| `diagrams/` | Editable draw.io sources for the shipped SVGs in `src/assets/diagrams/`. |
| `public/` | Static files served as they are, including social images and the IndexNow key file. |
| `scripts/` | Gate checks, the price tools, IndexNow submission and the push hook. |
| `tests/` | One Playwright spec per page or shared feature, plus Node tests for schemas, structured data, prices and the release check. |

### Enquiries

Every page that takes enquiries uses `EnquiryForm.astro` (which pages, and which fields, are decided in the ops brief). It sends the page it was sent from as a hidden field and is a plain POST to Formspark and works without JavaScript; there is no API key or browser script. It sets `_redirect` to `/enquiry-received/` and `_error` to `/enquiry-error/`. `_append=false` keeps personal data out of redirect URLs: never remove it. A hidden `_gotcha` checkbox is Formspark's honeypot; there is no CAPTCHA. The enquiry notice is `/privacy/enquiries/`. `tests/enquiry.spec.ts` and `tests/contact.spec.ts` stub Formspark's responses; real delivery is checked by hand.

### Analytics

Every page loads the cookieless Umami tag, limited by `data-domains` to the production hostnames. The only page script is the opt-out switch at `/privacy/#optout`, a bundled same-origin module that sets Umami's `umami.disabled` flag in `localStorage`. Without JavaScript, a fallback line shows instead.

### Structured data and search

`BaseLayout` gives every indexed page a canonical link, `og:url` and the JSON-LD identity graph; pages add their own nodes through its `schema` prop (a Course on each course page, a Service on `/power-bi/`, an ItemList on `/training/`, a ProfilePage on `/about/`, BreadcrumbLists below Training, Case studies and Privacy). Never put prices or offers in structured data. The 101's run date is typed in its schema and its `<time>` elements: change them together. `@astrojs/sitemap` lists indexed pages; `robots.txt` names the sitemap. `tests/structured-data.test.mjs` covers JSON-LD, `/llms.txt` and IndexNow.

## Prices

Training prices are on the live site but never in tracked files.

- They render only from the private `design/copy/training-prices.json` (a gitignored symlink into the ops repo), and only when `SHOW_TRAINING_PRICES` is exactly `true`. Every other build, including `npm run gate` and previews, is the "Price on request" variant.
- `src/lib/training-prices.mjs` validates every rate slot and fails a priced build with a fixed message on any missing or malformed value. It never falls back and never prints a value.
- Prices are static HTML on Home, Training, the four course pages and Consultancy. Coaching and the private 101 stay "Price on request" in both variants.
- `npm run check:prices` fails on any monetary literal, price-like assignment or private file in tracked files. A few reviewed files that legitimately hold a currency-like token are pinned by SHA256 in `scripts/check-prices.mjs`, so editing one of them means updating its digest.
- `npm run check:prices:dist` checks the built output: no amounts in the unpriced build; every slot on its routes and nowhere else in the priced one. Diagnostics name a rule and a path, never the matched text.
- To test the priced variant: `SHOW_TRAINING_PRICES=true npm run test:functional` against a priced `dist/`. Pipe priced runs through `node scripts/run-masked.mjs <command>` to mask amounts in the log. Reports, traces and Lighthouse output from a priced build can hold prices: keep them out of the repo.

## Publish

- **Branches.** `main` is live; `dev` is integration. Branches and Netlify previews can be public (previews are noindexed by header).
- **Push hook.** `scripts/hooks/pre-push` runs the gate and functional tests before every push, and `check:release` before a push to `main`.
- **Validate** (`.github/workflows/validate.yml`): on pushes to `dev` and pull requests to `dev` or `main`, the unpriced gate and functional tests.
- **Deploy** (`.github/workflows/deploy.yml`): on `main` only. Writes the `TRAINING_PRICES_JSON` Actions secret to the private file with `scripts/write-training-prices.mjs`, builds and tests the priced site through `run-masked.mjs`, runs `check:release`, uploads that same `dist/`, and removes the file whatever the outcome. A later job submits the sitemap to IndexNow; a failed submission leaves the deploy successful.
- Changing a price means updating both the ops prices file and the `TRAINING_PRICES_JSON` secret.
- GitHub Pages can't enforce HSTS or `frame-ancestors` through a meta CSP.
