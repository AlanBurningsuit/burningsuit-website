// Audits the existing build with default mobile emulation and throttling.
// BURNINGSUIT_LH_URL (for example http://127.0.0.1:4651) audits an already-running isolated preview instead of starting the default static server.
const base = process.env.BURNINGSUIT_LH_URL?.replace(/\/$/, "");
module.exports = {
  ci: {
    collect: {
      ...(base ? {} : { staticDistDir: "./dist" }),
      url: require("./scripts/lighthouse-routes.cjs").map((path) => `${base ?? "http://localhost"}${path}`),
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
