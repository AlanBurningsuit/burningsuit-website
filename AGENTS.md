# AGENTS.md

Orientation for anyone — human or AI — working in this repo.

## What this is

`burningsuit.co.uk` — the marketing site for Alan Harman-Box's solo **Power BI
& Fabric + AI advisory**. A static site: **Astro 6 + Tailwind v4**, no JS framework,
`output: "static"`, deployed to GitHub Pages via Actions. Current design is
"the field notebook" (flat Everforest green, 2026-07-11 warmth delta). All
styles live in `src/styles/` (`tokens.css` + `app.css`).

Header navigation is Power BI, Case studies and About, followed by **Book an hour**. Home introduces the work and case studies, then links to Power BI for the practical explanation of working together. The former situation anchors remain valid destinations on Power BI. `/hour/` explains the free call; booking buttons go directly to Cal.com. The four `/work/<slug>/` studies and `/writing/<slug>/` essays are MDX collections. There is one essay, so `/writing/` redirects to it until a second essay warrants an index. The retired AI Fit route redirects to `/power-bi/#ai`; legacy blog redirects retain their Power BI destination. Privacy and 404 complete the reading routes.

On `feat/ownership-redesign`, Alan has confirmed the booking event URL and supplied the essay text and reference slides for its four figures. Publication dates and confirmed talk venues remain outstanding. See `docs/ownership-redesign-implementation.md` for the remaining release inputs.

## Writing guidance

For writing as Alan, use `../burningsuit-ops/skills/writing-like-alan/SKILL.md` with its relevant playbook. The private sibling repository's `site/current-brief.md` owns the website writing scope; `brand/business-context.md` and `brand/claims-ledger.md` own business context and evidence. Keep private source material out of this public repository.

Alan resumed the homepage, Power BI and About revisions after the guidance workshop, using his page review as the current brief for this branch. This work does not authorise a push or deployment. Earlier approved copy and page sequences are not permanent writing requirements. The technical and release requirements below remain in force.

## Branches (only two)

- **`main`** — production. ⚠️ Whatever is on `main` **deploys to the live apex**
  (`deploy.yml` via Pages-Actions). Since go-live (2026-07-16) that is the full
  Astro site; the legacy site is preserved as a tag. Never push experiments
  here — a merge to `main` IS a production deploy.
- **`dev`** — integration branch and the home of the full Astro site (all real
  work). The Netlify preview builds from here.

Workflow:

```
git switch -c feat/<name> dev     # branch off dev
# …work…
git switch dev && git merge feat/<name>   # back to dev → Netlify rebuilds the preview = your test gate
```

Keep features on short-lived `feat/`/`fix/` branches off `dev`; merge to `dev`
to integrate and preview-test. Netlify can also build each branch/PR on its own
URL if you enable Deploy Previews — handy for testing a feature before it touches
`dev`.

## Deploy reality (non-obvious — read this)

Since 2026-07-02 the Pages source is **"GitHub Actions"** and `deploy.yml` is
**live production infrastructure**:

- **Live site:** GitHub Pages, validated and published by `deploy.yml` on every push to `main`. Explicit steps check out the source, set up Node 22 with npm caching, run `npm ci` and `npm run gate`, install Playwright Chromium with OS dependencies, then run `npm run test:functional` against the built `dist/`. Pages uploads that same tested artifact without rebuilding it. Only the deployment job can publish, and its guard permits `main` only.
- **Pull requests and integration:** `validate.yml` runs the same installation, gate and functional checks for PRs targeting `dev` or `main`, and pushes to `dev`. It has read-only repository permissions and does not publish. Windows screenshot baselines remain a local check because Linux rendering differs.
- **What main holds:** the full Astro site, live on the apex since go-live
  2026-07-16 (Pages run 29486479876). The pre-Astro legacy site is preserved
  as the `legacy-site-backup` git tag, not on any branch.
- **Netlify preview (`dev`):** Netlify builds the preview from `dev`
  (production branch = `dev`, `npm run build` → `dist/`, hard-noindexed).

## Go-live checklist (promoting the full site to production)

Go-live is **one move**: merge **`dev` → `main`** — the Action validates and publishes the tested artifact. Before that merge:

1. `npm run gate` and `npm run test:functional` green on `dev`, release visual/performance checks completed, and the Netlify preview eyeballed.
2. Merge, watch the Action, then **verify the live apex** renders the site.

Roll back by reverting the offending merge commit on `main` — the Action
redeploys the previous state. ⚠️ There is no "inert until switched" safety:
anything that lands on `main` ships.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | prep:images + `astro build` + byte-budget gate (must pass) |
| `npm run gate` | astro check → build (+budget) → link check → SEO/JSON-LD assertions |
| `npm run test:functional` | type-check tests/, then Chromium behaviour checks against the existing `dist/`; does not rebuild |
| `npm run preview` | serve the built `dist/` |
| `npm run test:visual` | type-check tests/, then Playwright snapshots (chromium + firefox + 390px mobile) |
| `npm run test:visual:update` | refresh snapshot baselines after an intentional visual change, then re-run `test:visual` to confirm green |
| `npm run test:lh` / `npm run test:links` | Lighthouse + link check |
| `npm run test:lh:mobile` | Three mobile audits each for Home and Power BI, including analytics |

Node 22.20+ (`.nvmrc`). Lighthouse audits the existing build; rebuild after source changes.

## Conventions & gotchas

- **Design tokens live in `src/styles/tokens.css`** — named scales for type
  (`--fs-*`, `--mono-*`), spacing (`--space-*`), motion (`--t-*`/`--ease-*`),
  colour, radius/border (`--r-*`/`--bw-*`), line-height/letter-spacing
  (`--lh-*`/`--ls-*`), and measures (`--measure-*`). Component CSS in `app.css`
  references `var(--…)` — **don't hardcode a value; add or reuse a token.**
- **Breakpoints stay literal** (CSS `@media` can't read custom properties) — keep
  every media query on the ladder **48 / 56 / 62rem**.
- **`resources/`** (raw photos/illustrations) and **`design/`** (process docs)
  are gitignored, kept local only. `scripts/prep-images.mjs` regenerates the
  optimised `src/assets/` photos from `resources/photos/`; it runs as the first
  step of `npm run build` when the source archive is present (locally) and
  **skips gracefully when it isn't** (Netlify/CI use the committed
  `src/assets/photos` derivatives). Re-run a build, or `npm run prep:images`,
  after changing a source photo, and commit the regenerated derivatives.
- The **`about-dog` visual snapshot** can flake (its clip-path photo reveal
  settles non-deterministically); a re-run usually goes green.
- **Renaming or removing a route? Add a redirect for the old path** in the
  `redirects` block in `astro.config.mjs` (legacy URLs from the old sites live
  there too). The SEO gate verifies every stub's target exists in the build, so
  a rename that strands existing stubs fails the gate — but only a human knows
  the old path needs a new entry. Redirect stubs are meta-refresh pages (the
  only redirect GitHub Pages supports); they're skipped by the SEO page
  contract and excluded from the sitemap automatically.
