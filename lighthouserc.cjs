// Audits the existing build; does not rebuild it.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: require("./scripts/lighthouse-routes.cjs").map((path) => `http://localhost${path}`),
      numberOfRuns: 1,
      settings: { preset: "desktop", blockedUrlPatterns: ["*umami.is*"] },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci" },
  },
};
