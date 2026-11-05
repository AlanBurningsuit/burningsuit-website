// Audits the existing build; does not rebuild it.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["http://localhost/index.html", "http://localhost/training/agentic-development-for-power-bi/", "http://localhost/power-bi/", "http://localhost/training/", "http://localhost/about/", "http://localhost/contact/", "http://localhost/training/how-i-train/"],
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
