# burningsuit.co.uk

The marketing site for Alan Harman-Box's solo Power BI, Fabric and AI advisory. Static Astro 6 and Tailwind v4, with MDX content collections, self-hosted fonts and optimised images. The field-notebook design uses tokens and semantic classes in `src/styles/`.

`main` is production on GitHub Pages. `dev` is integration, with a Netlify preview. A push to `main` triggers validation and deployment to the live apex. Ask before pushing any branch; preview publication and production promotion need separate authorisation.

## Local development

Use Node 22.20+ (see [.nvmrc](.nvmrc)) and keep checkouts outside OneDrive.

```bash
npm ci
npm run dev        # local development server
npm run build      # image preparation, static build and byte-budget check
npm run preview    # preview the built dist/
```

## Source layout

| Path | Purpose |
|---|---|
| `src/pages/` | Standing pages and collection routes |
| `src/content/work/` | Four case studies, one MDX file per slug |
| `src/content/writing/` | Essays; `/writing/` redirects to the sole essay until a second is published |
| `src/components/`, `src/layouts/` | Shared markup and page layouts |
| `src/styles/` | Design tokens and site styles |
| `src/assets/` | Committed optimised images and diagrams |
| `public/` | Static files, domain configuration and social cards |
| `scripts/`, `tests/` | Build checks, asset tooling and browser tests |

Raw photos and diagram sources live in ignored `resources/`; design material lives in ignored `design/`. `npm run prep:images` regenerates photo derivatives when the originals are present and skips gracefully otherwise. Commit regenerated derivatives after changing a source photo.

Case-study naming requires written permission and `namePublished: true`; the schema rejects a `named` block while that gate is closed. Keep private client information and source material out of this public repository, including its history. Writing scope and evidence belong in the private `burningsuit-ops` checkout.

## Validation

```bash
npm run gate             # Astro check, build, byte budgets, links and SEO
npm run test:functional  # Chromium behaviour checks against existing dist/
npm run test:visual      # Windows browser snapshots against existing dist/
npm run test:lh          # desktop Lighthouse against existing dist/
npm run test:lh:mobile   # Home and Power BI, three mobile audits each
```

Install test browsers once with `npx playwright install chromium firefox`. Build successfully before browser or Lighthouse checks, and rebuild after source changes. Snapshot baselines are platform-specific; review intentional visual changes before refreshing them. The release requirements and full command list are in [AGENTS.md](AGENTS.md).

## Deployment

[deploy.yml](.github/workflows/deploy.yml) validates and tests one static artifact, then uploads that same `dist/` to GitHub Pages. Only its deployment job can publish, and only from `main`. [validate.yml](.github/workflows/validate.yml) runs the gate and functional checks on `dev` pushes and PRs targeting `dev` or `main`, without publishing. The [Netlify preview configuration](netlify.toml) builds `dev` and hard-noindexes the preview.

Promote `dev` to `main` only after the checks and preview review in AGENTS.md, with push and release authorisation. Verify the live apex after deployment. Roll back by reverting the release merge on `main`, which triggers another validated deployment.

The [documentation index](docs/README.md) links current configuration and dated review records. Historical pending items and approvals describe their original work; they are not the current task list.
