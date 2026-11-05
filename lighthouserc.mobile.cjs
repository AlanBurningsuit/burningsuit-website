// Audits the existing build with default mobile emulation and throttling.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["http://localhost/index.html", "http://localhost/training/agentic-development-for-power-bi/", "http://localhost/power-bi/", "http://localhost/training/", "http://localhost/about/"],
      numberOfRuns: 3,
      settings: { formFactor: "mobile" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci/mobile" },
  },
};
