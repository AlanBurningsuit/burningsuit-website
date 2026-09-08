# burningsuit.co.uk

The burningsuit company site. Static, hand-built, no CMS. Current design is
**"the field notebook"** (flat Everforest green, 2026-07-11 warmth delta;
tokens + semantic classes in `src/styles/`).

**Stack:** Astro 6 · Tailwind v4 (via PostCSS) · MDX content collections (the
`/work` case studies) · self-hosted fonts (Astro Fonts API) · `astro:assets`
images (AVIF/WebP) · published to **GitHub Pages** by GitHub Actions
(`.github/workflows/deploy.yml`, on push to `main`).

**Branch reality:** `main` is production and serves the full Astro site. `dev` is integration with a Netlify preview. Merging `dev` → `main` deploys to the live apex; see `AGENTS.md` for the checklist. Ask before pushing any branch.

Both ownership comparison treatments were rejected; their copy was broadly accepted. The existing field-notebook design is retained, with no selection pending. The [implementation record](docs/ownership-preview-review.md) tracks the content transfer and validation.

## Local development

Requires **Node 22.20+** (see `.nvmrc`).

> **Develop outside OneDrive**, under `~/dev/Projects/`. OneDrive is for shared deliverables, never a git checkout. GitHub is the canonical remote.

```bash
npm install
npm run dev        # local dev server
npm run build      # prep:images + static build → dist/ + byte-budget gate
npm run preview    # preview the built site
npm run check      # astro check (types/templates)
```

### Images

`src/assets/photos/*` are **pre-resized derivatives** (capped so the responsive
fallback stays within budget). Regenerate them from the originals in
`resources/photos/` (local-only) with:

```bash
npm run prep:images
```

## Verification gates

```bash
npm run gate         # astro check → build (+byte budget)
                     #   → linkinator on dist/ → SEO/JSON-LD assertions
npm run serve        # serves dist/ on :4321 (Playwright runs against this)
npm run test:functional # type-checks tests/, then Chromium behavioural checks
npm run test:visual  # type-checks tests/, then Playwright region snapshots
                     #   (chromium + firefox + a 390px mobile project)
npm run test:lh      # Lighthouse CI (perf/a11y; slow lane, run pre-merge)
npm run test:lh:mobile # Home + Power BI: three mobile runs with analytics
```

`npm run test:visual` needs browsers once: `npx playwright install chromium firefox`.
Baselines are committed for **this Windows machine** (`…-win32.png`); on other
platforms regenerate a set first (`npm run test:visual:update`). The visual
gate is a **regression tripwire**, not a pixel oracle.

Both Lighthouse commands audit the existing `dist/`; neither builds it. Run `npm run gate` or `npm run build` successfully first, and rebuild after any source change before repeating either command. The desktop gate is unchanged. Mobile uses default mobile emulation and throttling, includes analytics, and requires median performance ≥0.95 and median CLS ≤0.1 over three runs per URL. Exported mobile reports are retained in `.lighthouseci/mobile/`; preserve raw `.lighthouseci/lhr-*` reports before the next collection clears them.

If mobile fails, inspect the reports for font, image and motion shifts. Retain those results before repeating the same mobile configuration with analytics blocked to isolate its contribution. Fix site-caused shortfalls; any proposed tracker exception needs both reports, audit rows and observed FCP/LCP, with Alan's documented decision.

## Content

Two tracks:

- **Case studies / proof** → an `.mdx` entry in the `work` collection
  (`src/content/work/`; schema in `src/content.config.ts`). The filename is the
  slug; the route and the `/work` tile are automatic.
- **Standing pages** → bespoke `.astro` under `src/pages/`.

**Naming is gated per study** by `namePublished` frontmatter: the named client +
quote render only when it is `true` AND written permission has landed. While
`false`, nothing named reaches the HTML — and the schema now **fails the build**
if a `named` block is committed with the gate closed (client names must never
enter this public repo's history). `src/config/flags.ts` is an empty shell kept
for future build-time copy flags.

## Deployment (GitHub Pages)

The Pages source is **GitHub Actions**. `deploy.yml` checks out the source, sets up Node 22 with npm caching, runs `npm ci` and `npm run gate`, installs Playwright Chromium with OS dependencies, then runs `npm run test:functional` against the existing `dist/`. It uploads that tested artifact, including `.nojekyll`, without another build. Only the deployment job has publishing permissions, and its guard permits `main` only. The Pages environment and concurrency protection remain in place.

`validate.yml` runs the same installation and validation steps for pushes to `dev` and PRs targeting `dev` or `main`, with read-only repository permissions and no publishing. Functional tests include test type-checking and use the built site. Windows screenshot baselines stay out of Linux CI because rendering and baseline names are platform-specific. The CSP tests retain deterministic tracker and beacon stubs.

**Go-live** means promoting `dev` → `main` after the required checks and preview review, then verifying the apex. Ask before pushing; preview publication and production promotion are separate authorisations. Roll back by reverting the release merge on `main`; the Action validates and redeploys the previous site. [Workflow verification and pending Dependabot reconciliation](docs/workflow-review.md) records the pinned releases and remaining remote follow-up.

`public/CNAME` preserves the apex domain; `public/.nojekyll` stops Jekyll
touching `_astro/`. DNS (Mythic Beasts, apex → GitHub Pages) is configured
separately. The Netlify preview (`netlify.toml`, production branch = `dev`) is
hard-noindexed and never competes with the apex.

### Security headers — platform limitation

CSP ships as a `<meta http-equiv>` tag generated by Astro (`security.csp`).
The page deliberately ships **no inline scripts** — the one external module is
covered by `script-src 'self'`, so there are no inline hashes to keep in sync.
**Plain GitHub Pages cannot send response headers**, so `frame-ancestors`
(clickjacking) and HSTS are **not enforceable** here — a meta CSP ignores
`frame-ancestors` by design. Revisit only if a CDN/proxy is ever placed in
front. Everything else in the policy (`default-src 'none'`,
`script-src 'self'`, `style-src 'self'`, etc.) is enforced, and
`tests/csp.spec.ts` asserts both the policy and its runtime cleanliness.

Analytics: **ON.** The site uses cookieless Umami Cloud behind two deliberately
coupled flags (`ANALYTICS.enabled` in `src/config/site.ts` and
`ANALYTICS_ENABLED` in `astro.config.mjs`). The CSP permits only Umami's two
hosts — the tracker script (`cloud.umami.is`, script-src) and its event beacon
(`gateway.umami.is`, connect-src). `tests/csp.spec.ts` asserts the script tag,
website id and both CSP permissions together so the configuration points
cannot drift.
