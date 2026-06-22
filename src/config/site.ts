/**
 * Site-wide constants + helpers — the single source of truth for the contact
 * email and the external booking link, so the conversion path stays consistent
 * and placement attribution (?src=) is built exactly one way.
 *
 * Why a booking LINK (not an embed): a top-level navigation is not governed by
 * the page CSP (`default-src 'none'` covers fetches, not link clicks), so an
 * external scheduling page needs ZERO CSP change and ships no third-party JS.
 */
export const CONTACT_EMAIL = "alan@burningsuit.co.uk";

/**
 * The hosted Cal.com scheduling page — Alan's 30-minute event, direct (skips the
 * profile menu) so the click matches the "book a 30-minute call" label.
 */
export const BOOKING_URL = "https://cal.com/alan-burningsuit/30min";

/**
 * Booking link tagged with the placement for attribution. Cal.com stores UTM
 * params with each booking, so `utm_content` shows the placement split in the
 * booking record/export — no analytics script or CSP change needed. Merges
 * cleanly if BOOKING_URL ever grows its own query string.
 */
export function bookingHref(src?: string): string {
  if (!src) return BOOKING_URL;
  const sep = BOOKING_URL.includes("?") ? "&" : "?";
  return `${BOOKING_URL}${sep}utm_source=burningsuit&utm_content=${encodeURIComponent(src)}`;
}

/** Build a mailto with an optional prefilled subject (mirrors BaseLayout). */
export function mailtoFor(subject?: string): string {
  return subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
}

/**
 * Cookieless analytics (Workstream D). DEFAULT OFF. Turning this on weakens the
 * deliberately-tight CSP: the matching `ANALYTICS_ENABLED` flag in
 * astro.config.mjs must be flipped to the same value so the provider host is
 * added to script-src + connect-src. Until traffic justifies it, the ?src= split
 * in the booking dashboard + asking on the call is the real signal — at
 * single-digit booking volume nothing here reaches significance.
 *
 * Plausible is the default (cookieless, EU-friendly, no cookie banner). Swap for
 * Fathom or a self-hosted/reverse-proxied first-party endpoint if preferred.
 */
export const ANALYTICS = {
  enabled: false,
  scriptSrc: "https://plausible.io/js/script.js",
  dataDomain: "burningsuit.co.uk",
} as const;
