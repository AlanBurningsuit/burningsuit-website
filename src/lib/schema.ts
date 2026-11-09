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

/* Page-specific nodes. Every value comes from what the page shows: no prices or offers (training prices never enter
   structured data), no dates or capacities the page doesn't state. */

/** A course page: what it is, who runs it, and how and for how many it runs. */
export function courseNode(opts: {
  siteUrl: string;
  pageUrl: string;
  name: string;
  description: string;
  /** Visible delivery: "Onsite" and/or "Online". */
  modes: ("Onsite" | "Online")[];
  /** Visible length as an ISO 8601 duration (P2D for "2 days", PT3H for a three-hour half day). */
  workload: string;
  /** Visible group maximum. */
  maxPeople: number;
  /** A scheduled run, as the page dates it (ISO 8601 with offset). */
  run?: { startDate: string; endDate: string };
}): SchemaNode {
  return compact({
    "@type": "Course",
    "@id": `${opts.pageUrl}#course`,
    name: opts.name,
    description: opts.description,
    url: opts.pageUrl,
    provider: { "@id": orgId(opts.siteUrl) },
    inLanguage: "en-GB",
    hasCourseInstance: compact({
      "@type": "CourseInstance",
      courseMode: opts.modes.length === 1 ? opts.modes[0] : opts.modes,
      courseWorkload: opts.workload,
      maximumAttendeeCapacity: opts.maxPeople,
      instructor: { "@id": personId(opts.siteUrl) },
      startDate: opts.run?.startDate,
      endDate: opts.run?.endDate,
    }),
  });
}

/** The consultancy offer as a Service from the Organization. */
export function serviceNode(opts: { siteUrl: string; pageUrl: string; name: string; description: string }): SchemaNode {
  return {
    "@type": "Service",
    "@id": `${opts.pageUrl}#service`,
    name: opts.name,
    serviceType: opts.name,
    description: opts.description,
    url: opts.pageUrl,
    provider: { "@id": orgId(opts.siteUrl) },
    areaServed: "GB",
  };
}

/** An ordered list of pages, by URL (the training chooser's courses). */
export function itemListNode(opts: { pageUrl: string; name: string; items: { name: string; url: string }[] }): SchemaNode {
  return {
    "@type": "ItemList",
    "@id": `${opts.pageUrl}#list`,
    name: opts.name,
    itemListElement: opts.items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: item.url })),
  };
}

/** About is Alan's profile page; its portrait is the page's main image. */
export function profilePageNode(opts: { siteUrl: string; pageUrl: string; image?: string }): SchemaNode {
  return compact({
    "@type": "ProfilePage",
    "@id": `${opts.pageUrl}#profile`,
    url: opts.pageUrl,
    mainEntity: { "@id": personId(opts.siteUrl) },
    isPartOf: { "@id": websiteId(opts.siteUrl) },
    primaryImageOfPage: opts.image ? { "@type": "ImageObject", url: opts.image } : undefined,
  });
}

/** Breadcrumbs from the home page down, each crumb a built page. */
export function breadcrumbNode(pageUrl: string, crumbs: { name: string; url: string }[]): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumbs`,
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.url })),
  };
}
