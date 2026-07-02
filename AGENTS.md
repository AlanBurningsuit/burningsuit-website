# AGENTS.md

Orientation for anyone — human or AI — working in this repo.

## What this is

`burningsuit.co.uk` — the marketing site for Alan Harman-Box's solo **Power BI
& Fabric + AI advisory** (what it's FOR lives in the north-star skill; this doc
is the how). A static site: **Astro 6 + Tailwind v4**, no JS framework,
`output: "static"`, deployed to GitHub Pages via Actions. Current design is v3
"the honest instrument" (flat Everforest green). All styles live in
`src/styles/` (`tokens.css` + `app.css`).

## Branches (only two)

- **`main`** — production. ⚠️ Whatever is on `main` **deploys to the live apex**
  (`deploy.yml` via Pages-Actions). Right now that is a one-page Astro
  placeholder; the legacy site is preserved as a tag. Never push experiments
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

- **Live site:** GitHub Pages, built and published by `deploy.yml`
  (`withastro/action`) on every push to `main`. The action runs the full
  `npm run build` — prep:images, astro build, AND the byte-budget gate — so a
  budget failure blocks a production deploy.
- **What main currently holds:** a one-page Astro placeholder proving the
  pipeline end-to-end on the apex. The pre-Astro legacy site is preserved as a
  git tag, not on any branch.
- **Astro site (`dev`):** the full site, preview only via **Netlify**
  (production branch = `dev`, `npm run build` → `dist/`, hard-noindexed).

## Go-live checklist (promoting the full site to production)

Go-live is **one move**: merge **`dev` → `main`** — the Action builds and
publishes it. Before that merge:

1. `npm run gate` green on `dev`, and the Netlify preview eyeballed.
2. Merge, watch the Action, then **verify the live apex** renders the site.

Roll back by reverting the merge commit on `main` — the Action redeploys the
placeholder. ⚠️ There is no "inert until switched" safety anymore: anything
that lands on `main` ships.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | prep:images + `astro build` + byte-budget gate (must pass) |
| `npm run gate` | **the de-facto CI**: astro check → build (+budget) → link check → SEO/JSON-LD assertions |
| `npm run preview` | serve the built `dist/` |
| `npm run test:visual` | type-check tests/, then Playwright snapshots (chromium + firefox + 390px mobile) |
| `npm run test:visual:update` | refresh snapshot baselines after an intentional visual change, then re-run `test:visual` to confirm green |
| `npm run test:lh` / `npm run test:links` | Lighthouse + link check |

Node 22 (`.nvmrc`).

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
