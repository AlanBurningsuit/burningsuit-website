# burningsuit.co.uk

The website for Alan Harman-Box's Power BI and AI training and consultancy. Static Astro 6 and Tailwind v4, with MDX case studies and essays, self-hosted fonts and optimised images. Standing pages are in `src/pages/`, collection content in `src/content/`, and design tokens and styles in `src/styles/`.

## Run locally

Use Node 22.20+ (`.nvmrc`) and keep the checkout outside OneDrive.

```bash
npm ci
npm run dev        # development server
npm run build      # prepare images, build dist/ and check byte budgets
npm run preview    # serve the production build
```

## Validate changes

```bash
npx playwright install chromium firefox   # once per setup
npm run gate             # types/templates, build, byte budgets, links and SEO
npm run test:functional  # Chromium behaviour checks
npm run test:visual      # Chromium, Firefox and mobile snapshots
npm run test:lh          # Lighthouse, desktop
npm run test:lh:mobile   # Lighthouse, mobile, with analytics
```

Browser and Lighthouse checks serve the existing `dist/`; they don't rebuild it, so build after source changes. Snapshot baselines are Windows-specific. For an intentional visual change, review the differences, run `npm run test:visual:update`, then rerun `npm run test:visual`.

## Generated assets

Photo originals live in the private brand repo's local photo library, `../burningsuit-brand/photos/`. The build regenerates the committed derivatives in `src/assets/photos/` when the originals are present, and uses the committed ones otherwise. After changing an original, commit its derivative.

Social cards are rendered from case-study frontmatter by `scripts/render-linkedin-featured.mjs` (the Power BI card's heading and palette are literals there). After changing them: `npm run build`, `npm run render:social`, `npm run build`, then commit `public/og-image.png` and `public/social/`.

## Deploy and roll back

`dev` is integration and builds a hard-noindexed Netlify preview; [validate.yml](.github/workflows/validate.yml) checks pushes to `dev` and PRs. `main` is production: a push to `main` runs [deploy.yml](.github/workflows/deploy.yml), which validates one build and publishes that same artifact to GitHub Pages. Roll back by reverting the release merge on `main`.
