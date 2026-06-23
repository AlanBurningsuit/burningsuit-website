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

/* ------------------------------------------------------------------ *
 * SEO / structured-data identity — the single source of truth for the
 * JSON-LD graph (src/lib/schema.ts assembles it; <Schema> emits it).
 *
 * Keep this in sync with the visible on-page copy: Google penalises
 * structured data that describes content the user can't see. Schema
 * strings duplicated as literals in a layout drift; sourced from here
 * they can't. Company-number-bearing fields (legalName, registration)
 * stay omitted until the real Companies House number lands (Stage 0) —
 * mirror that discipline for any field you can't yet stand behind.
 * ------------------------------------------------------------------ */
export const SITE_NAME = "burningsuit";

/** The org's own description (ProfessionalService). Distinct from a page's
 *  meta description, which each page writes for itself. */
export const ORG_DESCRIPTION =
  "Embedded Power BI and Fabric advisory, done with you — strategy, architecture review, and team capability — with a clear-eyed take on what AI means for how the work gets built.";

/** Postal identity (no street — area-served advisory, not a storefront). */
export const ORG_ADDRESS = {
  addressRegion: "West Sussex",
  addressCountry: "GB",
} as const;

/** The advisory's areas of work — used as Organization `knowsAbout`. (We model
 *  the business as schema.org Organization, not the now-discouraged generic
 *  ProfessionalService type; see burningsuit-schema-templates.) */
export const SERVICE_AREAS = [
  "Power BI advisory",
  "Microsoft Fabric advisory",
  "AI advisory for data teams",
] as const;

/**
 * The founder, for E-E-A-T Person schema. `sameAs` carries public profile
 * URLs (LinkedIn, etc.) that let answer engines tie the named author to a
 * real identity — the single biggest authority signal for an advisory.
 * Left EMPTY until Alan confirms the canonical URLs: never fabricate a
 * profile link (it fails the voice skill's truth test and Google's). Add
 * them here and they flow into Person + Organization automatically.
 */
export const FOUNDER = {
  name: "Alan Harman-Box",
  jobTitle: "Power BI, Fabric & AI advisor",
  knowsAbout: [
    "Power BI",
    "Microsoft Fabric",
    "DAX",
    "data modelling",
    "semantic models",
    "Power BI governance",
    "AI for data teams",
  ],
  /** Owner-supplied. e.g. "https://www.linkedin.com/in/…". Empty = omit. */
  sameAs: [] as string[],
} as const;
