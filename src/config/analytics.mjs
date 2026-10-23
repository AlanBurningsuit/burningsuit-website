// @ts-check
/**
 * Shared by the page shell and Astro's CSP configuration. Keep the tracker and
 * its allowed hosts together so enabling analytics requires only one change.
 * JavaScript lets the build config and TypeScript source use the same values.
 *
 * The tracker serves from cloud.umami.is and POSTs to gateway.umami.is.
 * domains limits reporting to production; performance adds Core Web Vitals.
 * The /privacy opt-out uses Umami's umami.disabled localStorage flag.
 */
export const ANALYTICS = Object.freeze({
  enabled: true,
  scriptSrc: "https://cloud.umami.is/script.js",
  beaconHost: "https://gateway.umami.is",
  websiteId: "7a27ff45-e9ce-4aec-8940-260c61c35dff",
  domains: "burningsuit.co.uk,www.burningsuit.co.uk",
  performance: true,
});
