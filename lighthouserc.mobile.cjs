// Audits the existing build with default mobile emulation and throttling.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: require("./scripts/lighthouse-routes.cjs").map((path) => `http://localhost${path}`),
      numberOfRuns: 3,
      // Audits never contact Umami, as on desktop.
      settings: { formFactor: "mobile", blockedUrlPatterns: ["*umami.is*"] },
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
