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
  "how-dax-treats-nulls-zeros": "blog/2020/11/how-dax-treats-nulls-zeros",
  "using-dynamic-values-smart-narrative-and-text-box": "blog/using-dynamic-values-smart-narrative-and-text-box",
  "using-continuous-x-axis-column-charts-year-and-month-labels": "blog/using-continuous-x-axis-column-charts-year-and-month-labels",
  "i-have-the-powerquery-using-power-query-to-call-rest-apis": "blog/2021/09/i-have-the-powerquery-using-power-query-to-call-rest-apis",
  "filtering-using-dax-measures": "blog/filtering-using-dax-measures",
};

/** An entry's route without slashes: its fixed URL above, else writing/<id>. A route that neither page file can build
    fails the build rather than linking somewhere that doesn't exist. Shared by the pages, the Writing index and the
    sitemap's lastmod (src/integrations/sitemap-lastmod.mjs). */
export function writingRoute(/** @type {string} */ id) {
  /** @type {string} */
  const route = writingRoutes[/** @type {keyof typeof writingRoutes} */ (id)] ?? `writing/${id}`;
  if (!/^(writing\/[a-z0-9-]+|blog(\/[a-z0-9-]+)+)$/.test(route)) {
    throw new Error(`Writing entry "${id}" has no buildable route (got "${route}"): use writing/<slug> or blog/<path> in src/config/writing-routes.mjs.`);
  }
  return route;
}
