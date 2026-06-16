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
  // Space Grotesk = the v2 display face (chosen from the rendered specimen test,
  //   design/v2). Its heaviest weight is 700, so the display bold IS 700.
  // Albert Sans proxies Bilo (body).
  // Commit Mono = the utility/voice face (the asides + footer furniture); not on
  //   Google, so self-hosted via Fontsource. The wink lives in this layer.
  // Fraunces = the one serif-italic accent, heroes only (A′); 470 interpolates.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Space Grotesk",
      cssVariable: "--font-grotesk",
      weights: [500, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Albert Sans",
      cssVariable: "--font-albert",
      weights: [400, 500],
      // normal only — the one body italic use (.lead em) is now a colour accent,
      // consistent with the other demoted ems (A′). Saves ~32KB (funds the mono).
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
    {
      provider: fontProviders.google(),
      name: "Fraunces",
      cssVariable: "--font-fraunces",
      // Heroes-only accent, a handful of words — a single static italic instance
      // (no variable axes) is much smaller than the range. CSS weight 470 maps to
      // this 500 instance. This is A′'s deferred byte-tuning, forced by the gate.
      weights: [500],
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
