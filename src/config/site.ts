/**
 * Site-wide constants + helpers — the single source of truth for the contact
 * email and the external booking link, so the conversion path stays consistent
 * and placement attribution (utm_content) is built exactly one way.
 *
 * Why a booking LINK (not an embed): a top-level navigation is not governed by
 * the page CSP (`default-src 'none'` covers fetches, not link clicks), so an
 * external scheduling page needs ZERO CSP change and ships no third-party JS.
 */
export const CONTACT_EMAIL = "alan@burningsuit.co.uk";

/**
 * Branch draft: the proposed 60-minute event URL is a stub, pending Alan's
 * confirmation and event setup. Keep the old 30min event live but unlisted.
 * All booking buttons use the same "Book an hour" label.
 */
export const BOOKING_URL = "https://cal.com/alan-burningsuit/hour";

/**
 * Booking link tagged with the placement for attribution. Cal.com stores UTM
 * params with each booking, so `utm_content` shows the placement split in the
 * booking record/export — no analytics script or CSP change needed. Merges
 * cleanly if BOOKING_URL ever grows its own query string.
 *
 * Placements renamed on 2026-09-08: header, footer, home-hero,
 * home-situations (when present), power-bi-hero, power-bi-pricing, hour-page,
 * work. Historical hero, home-proof and power-bi-engagement names apply only
 * before this date. Study-read events retain their per-study URL identity.
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
 * Cookieless Umami Cloud analytics (replaced Plausible, 2026-08-19). The
 * matching `ANALYTICS_ENABLED` flag in astro.config.mjs must stay enabled so
 * both provider hosts remain in the CSP — the script host (cloud.umami.is) in
 * script-src and the beacon host (gateway.umami.is, where the tracker POSTs
 * /api/send) in connect-src. The tracker auto-tracks pageviews on load and
 * needs no init call or inline snippet; the site id rides in the tag's
 * data-website-id attribute. Custom events go through `umami.track()` in
 * enhance.ts. Visitors can exclude themselves via the `umami.disabled`
 * localStorage flag (the /privacy opt-out toggle).
 */
export const ANALYTICS = {
  enabled: true,
  scriptSrc: "https://cloud.umami.is/script.js",
  websiteId: "7a27ff45-e9ce-4aec-8940-260c61c35dff",
} as const;

/* ------------------------------------------------------------------ *
 * SEO / structured-data identity — the single source of truth for the
 * JSON-LD graph (src/lib/schema.ts assembles it; <Schema> emits it).
 *
 * Keep this in sync with the visible on-page copy: Google penalises
 * structured data that describes content the user can't see. Schema
 * strings duplicated as literals in a layout drift; sourced from here
 * they can't. The Companies House registration is wired below (ORG_LEGAL,
 * confirmed against the register). Alan's confirmed LinkedIn identifies the
 * Person; the existing company mark identifies the Organization.
 * ------------------------------------------------------------------ */
export const SITE_NAME = "burningsuit";

/** Existing 400×400 company PNG; the graph resolves this against Astro.site. */
export const ORG_LOGO = "/social/burningsuit-mark-on-green.png";

/** The Organization's description. Distinct from a page's
 *  meta description, which each page writes for itself. */
export const ORG_DESCRIPTION =
  "Power BI and Fabric training, project support and experienced backup with Alan Harman-Box, so teams can build, understand and check their reporting.";

/** Postal identity (no street — area-served advisory, not a storefront). */
export const ORG_ADDRESS = {
  addressRegion: "West Sussex",
  addressCountry: "GB",
} as const;

/**
 * Companies House registration, wired into the Organization schema. Confirmed
 * against the register: legal name "BURNINGSUIT LIMITED" (standard-cased here;
 * the brand stays lowercase everywhere else), number 05738130 (8 digits, the
 * leading zero kept). Emitted as legalName + an identifier PropertyValue on the
 * Organization node (schema.ts).
 */
export const ORG_LEGAL = {
  legalName: "Burningsuit Limited",
  companyNumber: "05738130",
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
 * Owner-confirmed only: never fabricate a profile link (it fails the voice
 * skill's truth test and Google's). These identify the Person only, and
 * compact() in schema.ts omits the field while it's empty.
 */
export const FOUNDER = {
  name: "Alan Harman-Box",
  // Mirrors the visible ranking (owner call, 2026-07-02): Power BI & Fabric are
  // the front door; AI stays in knowsAbout/SERVICE_AREAS (ordered last).
  jobTitle: "Power BI & Fabric advisor",
  knowsAbout: [
    "Power BI",
    "Microsoft Fabric",
    "DAX",
    "data modelling",
    "semantic models",
    "Power BI governance",
    "AI for data teams",
  ],
  /** Owner-supplied, confirmed. Empty = omit. */
  sameAs: ["https://www.linkedin.com/in/alan-harman-box"] as string[],
} as const;
