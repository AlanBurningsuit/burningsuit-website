# burningsuit.co.uk

The marketing site for Alan Harman-Box's Power BI, Fabric and AI advisory. Static Astro 6 and Tailwind v4, with MDX case studies and essays, self-hosted fonts and optimised images. Standing pages are in `src/pages/`, collection content in `src/content/`, and design tokens and styles in `src/styles/`.

[AGENTS.md](AGENTS.md) contains contributor rules, release prerequisites and acceptance thresholds. Writing guidance, business evidence and historical website records live in the private `burningsuit-ops` repository.

## Run locally

Use Node 22.20+ on the Node 22 line (`.nvmrc`) and run commands from the repository root. Keep the checkout outside OneDrive.

```bash
npm ci
npm run dev        # development server
```

To preview the production build:

```bash
npm run build      # prepare images, build dist/ and check byte budgets
npm run preview
```

## Validate changes

Install browsers once per setup, then run the gate before the browser checks:

```bash
npx playwright install chromium firefox
npm run gate             # types/templates, build, byte budgets, links and SEO
npm run test:functional  # Chromium behaviour checks
npm run test:visual      # Chromium, Firefox and mobile snapshots
```

Browser checks serve the existing `dist/` automatically; they do not rebuild it. Rebuild after source changes. Committed snapshot baselines are Windows-specific; another platform needs its own reviewed set. For an intentional visual change, inspect the differences, run `npm run test:visual:update`, review the updated images and rerun `npm run test:visual` to confirm them.

Lighthouse also audits the existing `dist/` and serves it automatically. Build successfully first, then run the required audits:

| Command | Coverage and reports |
|---|---|
| `npm run test:lh` | Desktop page templates, with Umami blocked by the configured lab settings; reports in `.lighthouseci/` |
| `npm run test:lh:mobile` | Home and Power BI, three runs each with analytics included; exports in `.lighthouseci/mobile/` |

Before starting another Lighthouse collection, copy the complete `.lighthouseci/` directory into a newly named folder under ignored `.review-pass/`. This preserves the raw `lhr-*` reports and exports, including failed runs; the next collection can clear raw reports. Rebuild after any source change before repeating an audit. Use the acceptance and investigation rules in AGENTS.md when assessing results.

If mobile audits fail, inspect the retained reports for font, image and motion shifts. Preserve those results before repeating the same mobile configuration with analytics blocked to isolate its contribution. Retain both sets of reports and compare their audit rows and observed FCP/LCP; tracker exceptions follow the approval requirements in AGENTS.md.

## Maintain generated assets

Photo originals are local, ignored files in `resources/photos/`. `npm run prep:images` regenerates the committed derivatives in `src/assets/photos/`; it also runs during a build. A fresh checkout without the originals skips that step and uses the committed derivatives. After changing an original, regenerate and commit its derivative.

Case-study social cards read their frontmatter and use fonts from the built site. The Power BI card heading and colour palette are literals in [scripts/render-linkedin-featured.mjs](scripts/render-linkedin-featured.mjs); update those when changing that heading or palette. After updating the relevant content, branding or renderer, run:

```bash
npm run build
npm run render:social
npm run build
```

The final build includes the new PNGs in `dist/`. Review and commit the generated assets in `public/og-image.png` and `public/social/` with the source change.

For full-page screenshots of the current site, build first, then run `npm run serve` in a separate terminal. While that server is running, run `node scripts/shoot.mjs` from the repository root. Desktop and phone captures go to ignored `design/_astro-shots/` for human review.

## Deploy and roll back

`dev` is integration and the source of the [hard-noindexed Netlify preview](netlify.toml). [validate.yml](.github/workflows/validate.yml) runs the gate and functional checks on `dev` pushes and PRs targeting `dev` or `main`.

`main` is production. After completing the release steps in AGENTS.md, promote `dev` to `main`: a push to `main` triggers [deploy.yml](.github/workflows/deploy.yml), which validates and tests one build, then publishes that same artifact to GitHub Pages. Watch the Action and verify the live apex after deployment.

To roll back, revert the offending release merge on `main`; pushing that revert triggers another validated deployment. Push and release authorisation follow AGENTS.md.
