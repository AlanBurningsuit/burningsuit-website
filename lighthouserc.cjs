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
      // The Plausible tracker is excluded from the lab run (owner ruling,
      // 2026-07-16): Lantern charges the third-party origin ~1.5s of SIMULATED
      // FCP even though observed paint is identical with and without it
      // (454ms vs 474ms, TBT 0ms, 3KB async). Blocking it keeps the 0.95
      // perf assertion sensitive to regressions in the site's own code
      // instead of Lighthouse's third-party modelling.
      settings: { preset: "desktop", blockedUrlPatterns: ["*plausible.io*"] },
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
