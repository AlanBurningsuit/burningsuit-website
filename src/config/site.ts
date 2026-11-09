/* The site's identity: the single source for the JSON-LD graph (src/lib/schema.ts assembles it; Schema.astro emits it).
   Legal details and profiles follow the ops reference (site/reference.md); descriptions mirror approved visible copy,
   because structured data must describe what a reader can see. */
export const SITE_NAME = "burningsuit";
export const CONTACT_EMAIL = "alan@burningsuit.co.uk";

/** The 400 × 400 company mark, resolved against the site URL. */
export const ORG_LOGO = "/social/burningsuit-mark-on-green.png";

/** The burningsuit LinkedIn company page and its Google Business Profile, as published on the current site. */
export const ORG_PROFILES = [
  "https://www.linkedin.com/company/burningsuit/",
  "https://local.google.com/place?id=18439134739250695743&use=srp&hl=en-GB",
] as const;

/** The homepage's approved meta description. */
export const ORG_DESCRIPTION = "Power BI and AI training with Alan Harman-Box, for people whose job isn't Power BI. Find a course, or get help with your own reports.";

/** No street: an area, not a storefront. */
export const ORG_ADDRESS = { addressRegion: "West Sussex", addressCountry: "GB" } as const;

/** Companies House registration; the brand stays lowercase everywhere else. */
export const ORG_LEGAL = { legalName: "Burningsuit Limited", companyNumber: "05738130" } as const;

/** The three offers, as the site names them. */
export const SERVICE_AREAS = ["Power BI training", "Power BI coaching", "Power BI consultancy"] as const;

export const FOUNDER = {
  name: "Alan Harman-Box",
  knowsAbout: ["Power BI", "Microsoft Fabric", "DAX", "data modelling", "AI agents for Power BI"],
  /** Alan's LinkedIn, the Person's only profile. */
  sameAs: ["https://www.linkedin.com/in/alan-harman-box"],
} as const;
