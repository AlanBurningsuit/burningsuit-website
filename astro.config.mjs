// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
// Tailwind v4 is wired through PostCSS (postcss.config.mjs), not the Vite
// plugin: @tailwindcss/vite is currently incompatible with Astro 6's default
// rolldown-vite (withastro/astro#16542). PostCSS is the same engine, same
// @theme/@utility/@source directives — just a different integration point.

// Cookieless analytics (Workstream D). MUST match `ANALYTICS.enabled` in
// src/config/site.ts. The CSP permits only the provider host for the tracker
// script and event beacon. Swap ANALYTICS_HOST for a self-hosted/proxied
// first-party endpoint to avoid the third party entirely.
const ANALYTICS_ENABLED = true;
const ANALYTICS_HOST = "https://plausible.io";

// https://astro.build/config
export default defineConfig({
  site: "https://burningsuit.co.uk",
  base: "/", // apex custom domain — no project sub-path
  output: "static",
  trailingSlash: "ignore",

  // Legacy WordPress/intermediate-site URLs that still receive organic search
  // traffic (Plausible, 2026-07 post-go-live). Static output renders each as a
  // stub page: 0s meta refresh + noindex + canonical→target — the strongest
  // permanent-redirect signal plain GitHub Pages can carry. Keys must be the
  // non-slash form only (both variants as keys is unsupported; Pages 301s
  // /foo → /foo/ itself).
  redirects: {
    // Power BI technique posts → the Power BI hub (topical successor; no blog)
    "/blog/2019/04/7-secrets-of-the-matrix-visual": "/power-bi/",
    "/blog/7-secrets-matrix-visual": "/power-bi/",
    "/blog/7-secrets-line-chart": "/power-bi/",
    "/blog/2018/03/dax-how-to-use-a-slicer-to-select-different-measures": "/power-bi/",
    "/blog/2018/02/power-bi-free-vs-pro": "/power-bi/",
    "/blog/2021/06/charticulator-in-power-bi-5": "/power-bi/",
    "/blog/charticulator-power-bi-6": "/power-bi/",
    "/blog/2021/03/where-do-i-make-data-transformations-in-power-bi-roches-maxim": "/power-bi/",
    // Company-news post → the credibility page
    "/blog/burningsuit-featured-microsoft-business-applications-summit": "/about/",
    // "Power BI in practice" archive → the case-study index
    "/category/power-bi-in-practice": "/work/",
    // Old offer pages → their successors ("done with you" absorbed training)
    "/our-power-bi-consultancy": "/power-bi/",
    "/microsoft-training/custom-training": "/power-bi/",
    "/who-we-are/how-we-train": "/power-bi/",
    // Contact intent → the page that ends in the person + contact paths
    "/contact": "/about/",
    // Second sweep (GSC impressions, 2026-07-22 — the pre-relaunch URL-prefix
    // property still held 90 days of history). Training-era offer pages →
    // /power-bi/ ("done with you" absorbed training); people/contact → /about/;
    // case-study archive → /work/; legal → /privacy/.
    "/fully-flexible-training-dax-skills": "/power-bi/",
    "/fully-flexible-training-dax-skills/our-courses-power-bi-training": "/power-bi/",
    "/fully-flexible-training-dax-skills/our-courses-power-bi-training/3-power-bi-advanced":
      "/power-bi/",
    "/fully-flexible-training-dax-skills/our-courses-power-bi-training/10-power-bi-dax-fundamentals":
      "/power-bi/",
    "/fully-flexible-training-dax-skills/our-courses-power-bi-training/11-power-bi-dax-advanced":
      "/power-bi/",
    "/experts-microsoft-consultancy-and-training-burningsuit": "/power-bi/",
    "/team-member/alan-harman-box": "/about/",
    "/get-in-touch": "/about/",
    "/case-study": "/work/",
    "/case-study/analysing-survey-data": "/work/",
    "/privacy-policy": "/privacy/",
    "/terms-conditions": "/privacy/",
    // Third sweep (2026-07-22): URLs still in Google's index or linked from
    // live Google Business Profile listings.
    "/get-touch": "/about/",
    "/power-bi-training": "/power-bi/",
    "/training/expert-power-bi-training": "/power-bi/",
    "/who-we-are/person-power-bi-training": "/power-bi/",
    "/who-we-are/how-we-train/online-powerbi-training": "/power-bi/",
    "/who-we-are/our-clients": "/work/",
    // Fourth sweep (Plausible 404 events, 2026-07-16 → 2026-08-10): every real
    // content URL visitors actually hit. All technique/training-era pages, so
    // /power-bi/ is the topical successor throughout; /blog was the old index.
    "/blog": "/power-bi/",
    "/blog/i-have-powerquery-using-power-query-call-rest-apis": "/power-bi/",
    "/blog/categorising-measures-numeric-ranges-or-bins": "/power-bi/",
    "/blog/2020/01/categorising-measures-into-numeric-ranges-or-bins": "/power-bi/",
    "/blog/2021/08/context-transition-where-the-row-context-becomes-a-filter-context":
      "/power-bi/",
    "/blog/2015/01/excel-power-pivot-just-how-big-is-big": "/power-bi/",
    "/blog/using-continuous-x-axis-column-charts-year-and-month-labels": "/power-bi/",
    "/power-bi-composite-models-whats-the-big-deal": "/power-bi/",
    "/7-secrets-of-the-matrix-visual": "/power-bi/",
    "/training/power-bi-training/power-bi-fundamentals": "/power-bi/",
    // Fifth sweep (Plausible 404 events, 2026-08-10 → 2026-08-13): five legacy
    // content URLs that surfaced only after sweep 4 shipped. All Power BI /
    // Charticulator-era pages (incl. the book page and a WP-slug variant of the
    // already-stubbed fundamentals course), so /power-bi/ throughout.
    "/blog/2020/07/7-secrets-of-the-pie-chart": "/power-bi/",
    "/blog/2021/06/charticulator-in-power-bi-1": "/power-bi/",
    "/charticulator-in-power-bi-1": "/power-bi/",
    "/our-book-introducing-charticulator-for-power-bi": "/power-bi/",
    "/power-bi-training/power-bi-fundamentals": "/power-bi/",
  },
  build: {
    // Keep CSS external so `style-src 'self'` covers it without inline hashes.
    inlineStylesheets: "never",
  },

  integrations: [
    // MDX powers the `work` case-study collection (and the future blog). The
    // .mdx bodies render through the case-study component kit (Chapter/Snapshot/
    // Offer); no client JS is shipped — it's a build-time transform only.
    mdx(),
    // Auto-discovers built pages. /, /about, /ai-fit-for-teams, /power-bi,
    // /colophon and /work (+ /work/<slug>) are indexable; 404 is excluded.
    sitemap(),
  ],

  // --- Self-hosted fonts (downloaded + subset at build; no CDN at runtime) ---
  // v3 "the honest instrument" roster (Space Grotesk + Fraunces dropped):
  // Mona Sans = the display face (GitHub's grotesque; developer-credible,
  //   characterful). Not on Google, so self-hosted via Fontsource. 600 = the
  //   chunky buttons / go-links / list titles; 800 = the headline weight.
  // Albert Sans = body (a warm humanist sans standing in for the brand's Bilo);
  //   600 carries the lede emphasis (strong) in the display-free skin.
  // Commit Mono = all chrome / labels / asides / data — the instrument voice;
  //   not on Google, so self-hosted via Fontsource.
  // Emphasis is amber COLOUR, not a type-switch, so there is no serif/italic.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Mona Sans",
      cssVariable: "--font-mona",
      weights: [600, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Trebuchet MS", "Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Albert Sans",
      cssVariable: "--font-albert",
      weights: [400, 500, 600],
      // normal only — emphasis is an amber colour accent, never an italic.
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Arial", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Commit Mono",
      cssVariable: "--font-commit",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],

  // --- Content Security Policy, emitted as a per-page <meta http-equiv> ---
  // Astro auto-hashes the one inline (is:inline) script and any framework
  // inline styles, appending them to script-src / style-src.
  //
  // PLATFORM LIMITATION: plain GitHub Pages cannot send response headers, and a
  // meta-delivered CSP cannot enforce `frame-ancestors` (clickjacking) or carry
  // HSTS. Those are intentionally omitted here rather than shipped as no-ops.
  // Revisit if a CDN/proxy is ever put in front. See A6.
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "base-uri 'self'",
        "form-action 'none'",
        ...(ANALYTICS_ENABLED
          ? [/** @type {`connect-src${string}`} */ (`connect-src ${ANALYTICS_HOST}`)]
          : []),
      ],
      scriptDirective: {
        resources: ["'self'", ...(ANALYTICS_ENABLED ? [ANALYTICS_HOST] : [])],
      },
      styleDirective: { resources: ["'self'"] },
    },
  },
});
