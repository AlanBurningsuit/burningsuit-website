// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
// Tailwind v4 is wired through PostCSS (postcss.config.mjs), not the Vite
// plugin: @tailwindcss/vite is currently incompatible with Astro 6's default
// rolldown-vite (withastro/astro#16542). PostCSS is the same engine, same
// @theme/@utility/@source directives — just a different integration point.

// https://astro.build/config
export default defineConfig({
  site: "https://burningsuit.co.uk",
  base: "/", // apex custom domain — no project sub-path
  output: "static",
  trailingSlash: "ignore",
  build: {
    // Keep CSS external so `style-src 'self'` covers it without inline hashes.
    inlineStylesheets: "never",
  },

  integrations: [
    // Auto-discovers built pages. /, /ai-fit-for-teams, /power-bi and
    // /colophon are indexable; 404 is excluded by the integration. /about is
    // NOT emitted until its copy is signed (no unsigned copy leaks via sitemap).
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
  // Revisit if a CDN/proxy (e.g. Cloudflare) is ever put in front. See A6.
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
});
