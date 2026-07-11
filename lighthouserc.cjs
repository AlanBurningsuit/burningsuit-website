// Lighthouse CI for the static build. `npm run test:lh` builds nothing — run
// `npm run build` first; lhci serves dist/ itself and audits one page per
// template (both layouts: BaseLayout pages + a CaseStudyLayout study).
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "http://localhost/index.html",
        "http://localhost/ai-fit-for-teams/index.html",
        "http://localhost/power-bi/index.html",
        "http://localhost/about/index.html",
        "http://localhost/work/index.html",
        "http://localhost/work/law-firm/index.html",
      ],
      numberOfRuns: 1,
      settings: { preset: "desktop" },
    },
    assert: {
      // Scores are tightened to ERROR at 0.95 for performance + best-practices
      // (the budget is the argument; scores must back it up). Byte budgets
      // themselves are enforced separately by scripts/check-budget.mjs, since a
      // Lighthouse score won't gate kilobytes. a11y stays a hard error.
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci" },
  },
};
