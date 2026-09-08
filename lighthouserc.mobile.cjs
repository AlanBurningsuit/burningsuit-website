// Mobile audits the existing dist/ with analytics included. Build successfully
// first, and rebuild after source changes before repeating either LHCI command.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "http://localhost/index.html",
        "http://localhost/power-bi/index.html",
      ],
      numberOfRuns: 3,
      // Omitting preset keeps Lighthouse's default mobile emulation/throttling.
      settings: { formFactor: "mobile" },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0, aggregationMethod: "median" },
        ],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci/mobile" },
  },
};
