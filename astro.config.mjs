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
    // Lists only the real, indexable pages. /about + /contact are NOT emitted
    // this pass (unsigned copy), so they can't leak into the sitemap.
    sitemap(),
  ],

  // --- Self-hosted fonts (downloaded + subset at build; no Google CDN runtime) ---
  // Manrope proxies Objektiv Mk1 (display/UI). 700 added for nav/cta/kicker.
  // Albert Sans proxies Bilo (body). Fraunces proxies a future brand serif italic.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Manrope",
      cssVariable: "--font-manrope",
      weights: [500, 700, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Albert Sans",
      cssVariable: "--font-albert",
      weights: [400, 500],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Fraunces",
      cssVariable: "--font-fraunces",
      // Variable range so the design weight 470 interpolates; italic only.
      weights: ["400 500"],
      styles: ["italic"],
      subsets: ["latin"],
      fallbacks: ["Georgia", "serif"],
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
