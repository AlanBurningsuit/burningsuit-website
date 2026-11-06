/* JSON-LD builders: schema.org nodes from the site identity (src/config/site.ts) and per-page data, emitted by
   Schema.astro as one @graph. Every node is built from the same absolute site URL so @id references resolve. */
import { SITE_NAME, ORG_DESCRIPTION, ORG_ADDRESS, ORG_LEGAL, ORG_LOGO, ORG_PROFILES, SERVICE_AREAS, FOUNDER, CONTACT_EMAIL } from "../config/site";

export type SchemaNode = Record<string, unknown>;

export const orgId = (siteUrl: string) => `${siteUrl}#organization`;
export const personId = (siteUrl: string) => `${siteUrl}#person-alan`;
export const websiteId = (siteUrl: string) => `${siteUrl}#website`;

/** Drops undefined values and empty arrays, so optional fields are omitted rather than emitted empty. */
function compact(node: SchemaNode): SchemaNode {
  return Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)));
}

/** The identity graph on every indexable page: Organization, its founder and the WebSite. */
export function siteGraph(siteUrl: string): SchemaNode[] {
  return [
    compact({
      "@type": "Organization",
      "@id": orgId(siteUrl),
      name: SITE_NAME,
      legalName: ORG_LEGAL.legalName,
      description: ORG_DESCRIPTION,
      url: siteUrl,
      logo: new URL(ORG_LOGO, siteUrl).href,
      sameAs: [...ORG_PROFILES],
      email: CONTACT_EMAIL,
      identifier: { "@type": "PropertyValue", propertyID: "Companies House", value: ORG_LEGAL.companyNumber },
      founder: { "@id": personId(siteUrl) },
      areaServed: "GB",
      address: { "@type": "PostalAddress", ...ORG_ADDRESS },
      knowsAbout: [...SERVICE_AREAS],
    }),
    compact({
      "@type": "Person",
      "@id": personId(siteUrl),
      name: FOUNDER.name,
      knowsAbout: [...FOUNDER.knowsAbout],
      worksFor: { "@id": orgId(siteUrl) },
      url: `${siteUrl}about/`,
      sameAs: [...FOUNDER.sameAs],
    }),
    compact({ "@type": "WebSite", "@id": websiteId(siteUrl), name: SITE_NAME, url: siteUrl, publisher: { "@id": orgId(siteUrl) }, inLanguage: "en-GB" }),
  ];
}

/** An Article for an essay or case study; the author is Alan unless the page names another writer. */
export function articleNode(opts: { siteUrl: string; pageUrl: string; headline: string; description: string; author?: string }): SchemaNode {
  return compact({
    "@type": "Article",
    "@id": `${opts.pageUrl}#article`,
    headline: opts.headline,
    description: opts.description,
    url: opts.pageUrl,
    mainEntityOfPage: opts.pageUrl,
    isPartOf: { "@id": websiteId(opts.siteUrl) },
    author: !opts.author || opts.author === FOUNDER.name ? { "@id": personId(opts.siteUrl) } : { "@type": "Person", name: opts.author },
    publisher: { "@id": orgId(opts.siteUrl) },
    inLanguage: "en-GB",
  });
}
