// Existing URLs and anchors reserved during the rebuild; no page structure is prescribed.
export const redirects = {
  "/ai-fit-for-teams": "/power-bi/#ai",
  "/blog/7-secrets-matrix-visual": "/blog/2019/04/7-secrets-of-the-matrix-visual/",
  "/blog/7-secrets-line-chart": "/power-bi/",
  "/blog/2018/03/dax-how-to-use-a-slicer-to-select-different-measures": "/power-bi/",
  "/blog/2018/02/power-bi-free-vs-pro": "/power-bi/",
  "/blog/2021/06/charticulator-in-power-bi-5": "/power-bi/",
  "/blog/charticulator-power-bi-6": "/power-bi/",
  "/blog/burningsuit-featured-microsoft-business-applications-summit": "/about/",
  "/category/power-bi-in-practice": "/work/",
  "/our-power-bi-consultancy": "/power-bi/",
  "/microsoft-training/custom-training": "/training/",
  "/who-we-are/how-we-train": "/training/how-i-train/",
  "/fully-flexible-training-dax-skills": "/training/",
  "/fully-flexible-training-dax-skills/our-courses-power-bi-training": "/training/",
  "/fully-flexible-training-dax-skills/our-courses-power-bi-training/3-power-bi-advanced": "/training/",
  "/fully-flexible-training-dax-skills/our-courses-power-bi-training/10-power-bi-dax-fundamentals": "/training/dax-fundamentals/",
  "/fully-flexible-training-dax-skills/our-courses-power-bi-training/11-power-bi-dax-advanced": "/training/dax-deep-dive/",
  "/experts-microsoft-consultancy-and-training-burningsuit": "/power-bi/",
  "/team-member/alan-harman-box": "/about/",
  "/get-in-touch": "/contact/",
  "/case-study": "/work/",
  "/case-study/analysing-survey-data": "/work/",
  "/privacy-policy": "/privacy/",
  "/terms-conditions": "/privacy/",
  "/get-touch": "/contact/",
  "/power-bi-training": "/training/",
  "/training/expert-power-bi-training": "/training/",
  "/who-we-are/person-power-bi-training": "/training/#coaching",
  "/who-we-are/how-we-train/online-powerbi-training": "/training/how-i-train/",
  "/who-we-are/our-clients": "/work/",
  "/blog": "/writing/",
  "/blog/categorising-measures-numeric-ranges-or-bins": "/blog/2020/01/categorising-measures-into-numeric-ranges-or-bins/",
  "/blog/2021/08/context-transition-where-the-row-context-becomes-a-filter-context": "/power-bi/",
  "/blog/2015/01/excel-power-pivot-just-how-big-is-big": "/power-bi/",
  "/power-bi-composite-models-whats-the-big-deal": "/power-bi/",
  "/7-secrets-of-the-matrix-visual": "/blog/2019/04/7-secrets-of-the-matrix-visual/",
  "/training/power-bi-training/power-bi-fundamentals": "/training/power-bi-fundamentals/",
  "/blog/2020/07/7-secrets-of-the-pie-chart": "/power-bi/",
  "/blog/2021/06/charticulator-in-power-bi-1": "/power-bi/",
  "/charticulator-in-power-bi-1": "/power-bi/",
  "/our-book-introducing-charticulator-for-power-bi": "/power-bi/",
  "/power-bi-training/power-bi-fundamentals": "/training/power-bi-fundamentals/",
  "/power-bi-training/power-bi-advanced": "/training/",
  "/about-us/our-trainers": "/about/",
  "/hour": "/call/",
  // Seventh sweep, 18 Nov 2026: legacy URLs with human traffic in Umami (the checkout link first).
  "/training/agentic-development-for-power-bi": "/training/power-bi-with-ai-agents-101/#booking-terms-title",
  "/training/agentic-101": "/training/power-bi-with-ai-agents-101/",
  "/blog/where-do-i-make-data-transformations-power-bi-roches-maxim": "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim/",
  "/blog/2018/12/power-bi-strictly-come-dancing-the-results": "/power-bi/",
  "/blog/2019/12/strictly-come-dancing-series-17-report-version-2-is-here": "/power-bi/",
  "/blog/2019/01/the-strictly-report-behind-the-scenes": "/power-bi/",
  "/blog/2018/06/dax-how-to-group-measures-into-numeric-ranges": "/blog/2020/01/categorising-measures-into-numeric-ranges-or-bins/",
  "/blog/8th-secret-matrix-visual-controlling-calculations-and-labels-subtotals": "/blog/2020/10/the-8th-secret-of-the-matrix-visual-controlling-calculations-and-labels-on-subtotals/",
  "/blog/2018/11/four-dax-functions-you-cant-live-without": "/power-bi/",
  "/context-transition-where-the-row-context-becomes-a-filter-context": "/power-bi/",
  "/blog/2013/06/powerpivot-5-measure-for-measure": "/power-bi/",
  // 19 Nov 2026: Alison Box's restored posts take their aliases (and the 2018 numeric-ranges post, not restored, goes to
  // its 2020 bins version); /blog leads to the Writing index.
  "/blog/best-and-worst-two-approaches-finding-top-or-bottom-n-percent-using-dax": "/blog/2019/05/find-top-or-bottom-n-percent-dax/",
  "/find-top-or-bottom-n-percent-dax": "/blog/2019/05/find-top-or-bottom-n-percent-dax/",
  // 20 Nov 2026: five more restored posts take their other old addresses (two of which led to Consultancy until now).
  "/blog/how-dax-treats-nulls-zeros": "/blog/2020/11/how-dax-treats-nulls-zeros/",
  "/how-dax-treats-nulls-zeros": "/blog/2020/11/how-dax-treats-nulls-zeros/",
  "/blog/i-have-powerquery-using-power-query-call-rest-apis": "/blog/2021/09/i-have-the-powerquery-using-power-query-to-call-rest-apis/",
  "/i-have-the-powerquery-using-power-query-to-call-rest-apis": "/blog/2021/09/i-have-the-powerquery-using-power-query-to-call-rest-apis/"
};

// Manifest routes that have their own page in src/pages; each keeps its reserved anchors (check:seo).
export const bespokeRoutes = ["", "power-bi", "training", "about", "contact", "privacy", "work"];

// Reserved for possible future entries; no document or redirect is generated.
export const reserved404Routes = ["work/law-firm", "work/museum"];

export const pages = {
  "about": [
    "capable",
    "human",
    "origin",
    "dog"
  ],
  "contact": [],
  "privacy": [
    "who",
    "analytics",
    "optout",
    "hosting",
    "booking",
    "seat",
    "recordings",
    "newsletter",
    "email",
    "rights",
    "changes"
  ],
  "": [
    "in-practice",
    "situations"
  ],
  "training": [],
  "power-bi": [
    "situations",
    "how-the-work-runs",
    "pricing",
    "ai",
    "ongoing",
    "start"
  ],
  "work": [
    "cases"
  ],
  "blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim": [
    "data-transformations",
    "dax-transformations",
    "power-query-transformations",
    "dataflow-transformations",
    "original-data-transformations",
    "choices-choices",
    "why-is-this-important"
  ],
  "work/museum": [],
  "work/law-firm": [],
  "work/carbon-footprint": [],
  "work/contact-centre": [],
  // The coaching study's "The rule I got wrong" heading, linked from How I train's "If you get stuck".
  "work/individual-power-bi-coaching": [
    "rule-title"
  ],
  "writing/we-are-all-middle-management-now": [],
  "writing": [],
  "blog/2019/04/7-secrets-of-the-matrix-visual": [],
  "blog/2020/10/the-8th-secret-of-the-matrix-visual-controlling-calculations-and-labels-on-subtotals": [],
  "blog/2020/01/categorising-measures-into-numeric-ranges-or-bins": [],
  "blog/2019/05/find-top-or-bottom-n-percent-dax": [],
  "blog/2020/11/how-dax-treats-nulls-zeros": [],
  "blog/using-dynamic-values-smart-narrative-and-text-box": [],
  "blog/using-continuous-x-axis-column-charts-year-and-month-labels": [],
  "blog/2021/09/i-have-the-powerquery-using-power-query-to-call-rest-apis": [],
  "blog/filtering-using-dax-measures": []
};
