// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { ANALYTICS } from "./src/config/analytics.mjs";
import { redirects } from "./src/config/compatibility.mjs";
import { formActionSource } from "./src/config/enquiry.mjs";

export default defineConfig({
  site: "https://burningsuit.co.uk",
  output: "static",
  trailingSlash: "ignore",
  redirects,
  build: { inlineStylesheets: "never" },
  fonts: [
    {
      provider: fontProviders.fontsource(), name: "Mona Sans",
      cssVariable: "--font-mona", weights: [600, 700, 800], styles: ["normal"],
      subsets: ["latin"], fallbacks: ["Trebuchet MS", "Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(), name: "Albert Sans",
      cssVariable: "--font-albert", weights: [400, 500, 600], styles: ["normal"],
      subsets: ["latin"], fallbacks: ["Arial", "sans-serif"],
    },
    {
      // A renamed Latin subset of Libron (OFL; see src/assets/fonts/burningsuit-reader-OFL.txt).
      provider: fontProviders.local(), name: "Burningsuit Reader", cssVariable: "--font-reader",
      options: { variants: [{ weight: 400, style: "normal", src: ["./src/assets/fonts/burningsuit-reader-400.woff2"] }] },
      fallbacks: ["Georgia", "serif"],
    },
  ],
  // GitHub Pages cannot enforce frame-ancestors or HSTS through a meta CSP.
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'", "img-src 'self' data:", "font-src 'self'",
        "base-uri 'self'", /** @type {`form-action${string}`} */ (`form-action ${formActionSource}`),
        ...(ANALYTICS.enabled
          ? [/** @type {`connect-src${string}`} */ (`connect-src ${ANALYTICS.beaconHost}`)]
          : []),
      ],
      scriptDirective: {
        resources: ["'self'", ...(ANALYTICS.enabled ? [new URL(ANALYTICS.scriptSrc).origin] : [])],
      },
      styleDirective: { resources: ["'self'"] },
    },
  },
});
