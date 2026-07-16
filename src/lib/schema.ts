/**
 * JSON-LD builders — assemble schema.org nodes from the identity source
 * (src/config/site.ts) and per-page data, ready for <Schema> to emit as a
 * single `@graph` block in the document head.
 *
 * Why builders (not literals in the layout): schema must mirror the visible
 * copy and stay internally linked by `@id`. Building every node from the same
 * `siteUrl` keeps URLs absolute and the graph connected (Article → author →
 * Organization), which is what answer engines reward. Nothing here is emitted
 * client-side — the callers are .astro layouts that render at build time.
 *
 * `siteUrl` is the absolute origin WITH a trailing slash (Astro.site.href),
 * e.g. "https://burningsuit.co.uk/". `@id`s are fragment refs off it so the
 * same entity resolves the same way on every page.
 */
import {
  SITE_NAME,
  ORG_DESCRIPTION,
  ORG_ADDRESS,
  ORG_LEGAL,
  SERVICE_AREAS,
  FOUNDER,
  CONTACT_EMAIL,
} from "../config/site";

export type SchemaNode = Record<string, unknown>;

export const orgId = (siteUrl: string) => `${siteUrl}#organization`;
export const personId = (siteUrl: string) => `${siteUrl}#person-alan`;
export const websiteId = (siteUrl: string) => `${siteUrl}#website`;

/** Drop empty arrays / undefined so optional fields (sameAs, dates) simply
 *  don't appear rather than emitting `"sameAs": []`. */
function compact(node: SchemaNode): SchemaNode {
  return Object.fromEntries(
    Object.entries(node).filter(
      ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

/**
 * The site-wide identity graph emitted on every indexable page:
 * Organization ⇄ Person (founder) ⇄ WebSite. Page-type nodes (Article,
 * BreadcrumbList, FAQPage) reference these by @id.
 *
 * Modelled as Organization (the business) + Person (the human), NOT the generic
 * ProfessionalService type (schema.org discourages it) or LocalBusiness (no
 * physical storefront). `knowsAbout` carries the service areas; `areaServed` is
 * valid+true though Google doesn't consume it on Organization.
 */
export function siteGraph(siteUrl: string): SchemaNode[] {
  const organization = compact({
    "@type": "Organization",
    "@id": orgId(siteUrl),
    name: SITE_NAME,
    legalName: ORG_LEGAL.legalName,
    description: ORG_DESCRIPTION,
    url: siteUrl,
    email: CONTACT_EMAIL,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Companies House",
      value: ORG_LEGAL.companyNumber,
    },
    founder: { "@id": personId(siteUrl) },
    areaServed: "GB",
    address: { "@type": "PostalAddress", ...ORG_ADDRESS },
    knowsAbout: [...SERVICE_AREAS],
    sameAs: [...FOUNDER.sameAs],
  });

  const person = compact({
    "@type": "Person",
    "@id": personId(siteUrl),
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    knowsAbout: [...FOUNDER.knowsAbout],
    worksFor: { "@id": orgId(siteUrl) },
    // Trailing slash matters: /about/ is the canonical form every page links
    // and the sitemap emits — the entity URL must resolve the same way.
    url: `${siteUrl}about/`,
    sameAs: [...FOUNDER.sameAs],
  });

  const website = compact({
    "@type": "WebSite",
    "@id": websiteId(siteUrl),
    name: SITE_NAME,
    url: siteUrl,
    publisher: { "@id": orgId(siteUrl) },
    inLanguage: "en-GB",
  });

  return [organization, person, website];
}

/**
 * An Article node for editorial pages (case studies, future blog posts).
 * `author`/`publisher` reference the site graph by @id; dates are emitted
 * only when present (the freshness signal answer engines weight heavily).
 */
export function articleNode(opts: {
  siteUrl: string;
  pageUrl: string;
  headline: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}): SchemaNode {
  return compact({
    "@type": "Article",
    "@id": `${opts.pageUrl}#article`,
    headline: opts.headline,
    description: opts.description,
    url: opts.pageUrl,
    mainEntityOfPage: opts.pageUrl,
    isPartOf: { "@id": websiteId(opts.siteUrl) },
    author: { "@id": personId(opts.siteUrl) },
    publisher: { "@id": orgId(opts.siteUrl) },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
  });
}

/** A BreadcrumbList from ordered { name, url } crumbs (Home → Work → page). */
export function breadcrumbList(items: { name: string; url: string }[]): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/**
 * A FAQPage from { question, answer } pairs. The on-page Q&A MUST be visible
 * (Google penalises FAQ schema that isn't mirrored in the rendered content),
 * so only build this from questions a page actually shows.
 */
export function faqPage(qa: { question: string; answer: string }[]): SchemaNode {
  return {
    "@type": "FAQPage",
    mainEntity: qa.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
