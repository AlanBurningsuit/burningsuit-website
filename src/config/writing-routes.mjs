// Fixed public URLs: the archive posts' original addresses and the essay's established one. An entry not listed here is
// served at writing/<id> (writingRoute in src/lib/writing.ts). Routes under blog/ are built by
// src/pages/blog/[...slug].astro, routes under writing/ by src/pages/writing/[slug].astro.
export const writingRoutes = {
  "we-are-all-middle-management-now": "writing/we-are-all-middle-management-now",
  "roches-maxim": "blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim",
  "7-secrets-of-the-matrix-visual": "blog/2019/04/7-secrets-of-the-matrix-visual",
  "the-8th-secret-of-the-matrix-visual": "blog/2020/10/the-8th-secret-of-the-matrix-visual-controlling-calculations-and-labels-on-subtotals",
  "categorising-measures-into-numeric-ranges-or-bins": "blog/2020/01/categorising-measures-into-numeric-ranges-or-bins",
  "find-top-or-bottom-n-percent-dax": "blog/2019/05/find-top-or-bottom-n-percent-dax",
};
