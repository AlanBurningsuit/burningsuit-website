# Ownership redesign: design selection

The first milestone is ready for Alan to choose a direction. The feature branch starts from `dev` and carries the two existing local maintenance commits. Nothing has been pushed or deployed.

## Open the two designs

Run `npm run dev -- --host 127.0.0.1 --port 4322`, then open:

| Direction | Home | Power BI |
| --- | --- | --- |
| A — Aligned and elevated | <http://127.0.0.1:4322/design-preview/elevated/> | <http://127.0.0.1:4322/design-preview/elevated/power-bi/> |
| B — Bold and personal | <http://127.0.0.1:4322/design-preview/personal/> | <http://127.0.0.1:4322/design-preview/personal/power-bi/> |

Each page has a comparison bar with links to both pages in that treatment and the equivalent page in the other treatment. The other navigation links lead to the existing pages; those await selection.

The two treatments render the same Home and Power BI components, in the same order, with the same photographs, evidence, approved prices and contact links. A uses aligned dark compositions with cream evidence panels. B uses warm reading surfaces, larger portraits and display type, and substantial green and magenta sections.

`npm run test:previews` checks both treatments and writes full-page desktop (1440×900) and mobile (390×844) captures, plus opening-screen captures, to the ignored `.preview-review/` directory. It also checks 320px, tablet, 1280px desktop, short landscape and a 640×360 effective viewport corresponding to a 1280×720 browser at 200% zoom.

The comparison route's `getStaticPaths` returns paths only under `import.meta.env.DEV`. It has no production override. All comparison documents are noindex and omit canonical links and structured data. Production output and sitemap exclusion have a functional test. The local comparison does not load the production Umami tracker; the approved contact event names, placement parameters and email subjects remain in the shared contact implementation.

## Completed in this milestone

- Shared ownership-led Home and forwardable Power BI copy, including all five entry situations, the working mechanism, standalone Discovery, rolling and upfront terms, tapering and lighter support.
- Discovery at £1,950 and the £3,000–£6,000 substantial-team monthly guide, excluding VAT. Discovery credit is restricted to upfront bookings of at least three months.
- Separate AI decision and practical-support routes, with no AI Fit price or speculative product capability claims.
- Two complete responsive treatments using existing fonts, photographs and logos.
- Footer in normal flow, persistent navigation, contrasting focus indicators and removal of reveal, mask, stagger, photo-curtain and cross-document transition effects. Study-read analytics is preserved.
- `test:functional` separated from screenshot tests, with keyboard/footer, navigation, no-JavaScript, reduced-motion, analytics, privacy and production-isolation coverage.
- Private positioning and design guidance updated outside this public repository.

## Validation

- `npm run gate`: passed, including type checking, static build, byte budgets, internal links, SEO/JSON-LD and all 47 redirect targets.
- `npm run test:functional`: passed on Chromium.
- `npm run test:previews`: passed, including identical text/contact attribution across treatments, image loading, responsive layouts and natural keyboard access to footer links.
- `npm run test:visual:update`, then `npm run test:visual`: 57 passed, three desktop-only geometry checks intentionally skipped on mobile. Three Windows footer baselines changed by one pixel in height; other existing regions matched.

The existing Astro check reports 24 advisory hints (primarily the deprecated `astro:content` Zod export), with no errors or warnings. Supported dependency-chain updates are part of the next milestone.

## After the choice

1. Apply the selected shell and treatment to the public Home and Power BI routes. Remove the unused treatment, temporary comparison route/layout/config and preview tests.
2. Update AI, case-study summaries and shared invitation, About, navigation, privacy and 404. Verify product-specific AI claims against current Microsoft documentation.
3. Correct Organization/Person structured-data identity and include the existing company logo.
4. Update affected dependency chains, record any remaining advisory applicability, and add weekly npm Dependabot updates targeting `dev`.
5. Add PR and `dev` CI for installation, gate, test type-checking and Chromium functional tests. Production deployment must publish the artifact that passed these checks.
6. Complete validation of the selected production build, including actual 200% browser zoom, mobile Lighthouse on Home and Power BI with analytics included, contrast and natural keyboard use, refreshed Windows visual baselines, and the external booking handoff without submitting an appointment.
7. Prepare the tested release commits. Ask before a preview push or production promotion. After an approved release, verify the live apex and booking handoff; rollback is a revert of the release merge.

No direction is selected by these files or their order in the comparison.
