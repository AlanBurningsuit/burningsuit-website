# AGENTS.md

Orientation for anyone — human or AI — working in this repo.

## What this is

`burningsuit.co.uk` — a static marketing site. **Astro 6 + Tailwind v4**, no JS
framework, `output: "static"`, deployed to GitHub Pages. Current design is v3
"the honest instrument" (flat Everforest green). All styles live in
`src/styles/` (`tokens.css` + `app.css`).

## Branches (only two)

- **`main`** — production. ⚠️ Right now this is the *legacy* hand-built site
  (`index.html` + assets at the repo root), which is what GitHub Pages actually
  serves (see **Deploy reality**). Treat it as live; never push experiments here.
- **`dev`** — integration branch and the home of the Astro site (all real work).
  The Netlify preview builds from here.

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

- **Live site:** GitHub Pages, `build_type: legacy`, serving **`main` branch root
  `/`**. The live page is the root `index.html` on `main` — *not* the Astro
  build, *not* a workflow.
- **Astro site (`dev`):** not in production yet. Preview only, via **Netlify**
  (production branch = `dev`, `npm run build` → `dist/`). `.github/workflows/
  deploy.yml` (`withastro/action`) exists but is **inert** until the Pages source
  is switched to "GitHub Actions".

## Go-live checklist (promoting the Astro site to production)

`dev` descends cleanly from `main` (fast-forward), but go-live is **two
coordinated moves — do them together**:

1. **Settings → Pages → Source → "GitHub Actions"** so `deploy.yml` builds and
   publishes the Astro `dist/`.
2. Merge **`dev` → `main`** (this also carries `deploy.yml` onto `main`).

⚠️ Never do step 2 without step 1: legacy Pages would try to serve the Astro
*source* tree (no root `index.html`) and the live site would break. Verify the
apex after deploying.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | `astro build` + byte-budget gate (must pass) |
| `npm run preview` | serve the built `dist/` |
| `npm run test:visual` | Playwright visual snapshots (chromium + firefox) |
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
  optimised `src/assets/` photos from `resources/photos/` — a manual step, not
  part of `npm run build`.
- The **`about-dog` visual snapshot** can flake (its clip-path photo reveal
  settles non-deterministically); a re-run usually goes green.
