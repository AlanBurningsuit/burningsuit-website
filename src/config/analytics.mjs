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

/**
 * Click events, counted beside page views (the privacy notice says so; change the two together).
 * "Link" events are on-site links towards a booking page; the others leave for Stripe or Cal.com,
 * send the enquiry form or subscribe to the newsletter. Umami records the page each happened on; `place` tells apart two on one page.
 * Mark links with src/components/Tracked.astro, never with the attribute on the link itself.
 */
export const EVENTS = Object.freeze({
  bookSeat: "book-seat",
  bookSeatLink: "book-seat-link",
  bookCall: "book-call",
  bookCallLink: "book-call-link",
  enquirySend: "enquiry-send",
  newsletterSubscribe: "newsletter-subscribe",
});
