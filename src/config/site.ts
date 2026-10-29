/**
 * Site-wide constants + helpers — the single source of truth for the contact
 * email and the external booking link, so the conversion path stays consistent
 * and placement attribution (utm_content and placement) is built exactly one way.
 *
 * Why a booking LINK (not an embed): a top-level navigation is not governed by
 * the page CSP (`default-src 'none'` covers fetches, not link clicks), so an
 * external scheduling page needs ZERO CSP change and ships no third-party JS.
 */
export const CONTACT_EMAIL = "alan@burningsuit.co.uk";

/**
 * Alan confirmed this 60-minute event URL on 2026-09-09.
 * Keep the old 30min event live but unlisted.
 * All booking buttons use the same "Book an hour" label.
 */
export const BOOKING_URL = "https://cal.com/alan-burningsuit/hour";

/**
 * Booking link tagged with the button location in both `utm_content` and
 * `placement`. Existing UTM attribution and analytics events keep the same
 * location value. Merges cleanly if BOOKING_URL grows its own query string.
 *
 * Placements renamed on 2026-09-08: header, footer, home-hero (retired
 * 2026-10-27, when Home's hero began leading to /training/),
 * home-situations (when present), power-bi-hero, power-bi-pricing, hour-page,
 * work. Since 29 Oct 2026 header and footer carry the free hour only on
 * pages whose ask it is (asks.ts). Historical hero, home-proof and power-bi-engagement names apply only
 * before this date. Study-read events retain their per-study URL identity.
 */
export function bookingHref(src?: string): string {
  if (!src) return BOOKING_URL;
  const sep = BOOKING_URL.includes("?") ? "&" : "?";
  const placement = encodeURIComponent(src);
  return `${BOOKING_URL}${sep}utm_source=burningsuit&utm_content=${placement}&placement=${placement}`;
}

/**
 * How someone books a seat on the 101. Still open in the website brief (it
 * must exist before the 1 Dec invitations, and should ask "how did you hear
 * about this?"). Undefined until Alan decides: the 101's ask then falls back
 * to registering interest by email, and no link points at an undecided URL.
 * See askLink() in asks.ts.
 */
export const BOOKING_101_URL: string | undefined = undefined;

/** The Kit signup page for "Notes from burningsuit". */
export const NOTES_URL = "https://burningsuit.kit.com/";

/**
 * The inline signup form at the end of every essay posts here, as a plain
 * HTML form: no Kit script, no popup. It is Kit's "Website essays (inline)"
 * form, created 29 Oct 2026 for essays only, so Kit's per-form report is the
 * count of sign-ups from essays. Allowed by the CSP's form-action.
 */
export const KIT_ESSAY_FORM_ACTION = "https://app.kit.com/forms/10117647/subscriptions";

/**
 * Notes signup link tagged with the link location in `utm_content`, so Kit's
 * subscriber source and the "Notes click" event share one placement value.
 * Placements: archive (the restored 2021 post). Before 29 Oct 2026 also
 * footer and essay, which became the essays' inline form (asks.ts).
 */
export function notesHref(src: string): string {
  return `${NOTES_URL}?utm_source=burningsuit&utm_content=${encodeURIComponent(src)}`;
}

/** Build a mailto with an optional prefilled subject. */
export function mailtoFor(subject?: string): string {
  return subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
}

export { ANALYTICS } from "./analytics.mjs";

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

/** Public company profiles verified during the September 2026 profile cleanup. */
export const ORG_PROFILES = [
  "https://www.linkedin.com/company/burningsuit/",
  "https://local.google.com/place?id=18439134739250695743&use=srp&hl=en-GB",
] as const;

/** The Organization's description. Distinct from a page's
 *  meta description, which each page writes for itself. */
export const ORG_DESCRIPTION =
  "Alan Harman-Box teaches Power BI and AI to teams, and works alongside Power BI and Fabric teams as a consultant.";

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

/** The business's areas of work — used as Organization `knowsAbout`. Training
 *  leads since the 27 Oct 2026 revamp; "Power BI training" matches the Google
 *  Business Profile's service name. (We model the business as schema.org
 *  Organization, not the now-discouraged generic ProfessionalService type;
 *  see burningsuit-schema-templates.) */
export const SERVICE_AREAS = [
  "Power BI training",
  "AI training for teams",
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
    "agentic development for Power BI",
  ],
  /** Owner-supplied, confirmed. Empty = omit. */
  sameAs: ["https://www.linkedin.com/in/alan-harman-box"] as string[],
} as const;
