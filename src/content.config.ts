import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Content collections.
 *
 * `work` — the case-study / proof collection rendered at /work and /work/<slug>.
 * One .mdx per engagement: the body is the ANONYMISED narrative (authored against
 * the <Chapter>/<Snapshot>/<Offer> kit so it keeps the site's chaptered reveal
 * choreography); the named client + verbatim quote live in the `named` frontmatter
 * and render only when `namePublished` is true. Default is anonymised — the named
 * block is never emitted to the build while the boolean is false, so view-source
 * can't leak a PERMISSION-PENDING quote. See design/copy/case-studies/.
 *
 * `blog` — the field-notes collection rendered at /blog and /blog/<slug>.
 * Same loader + MDX kit as `work`: one .mdx per post (the filename is the
 * slug), dated essays sorted newest-first on the index. No naming gate — posts
 * are Alan's own writing and carry nothing client-identifying.
 */
const work = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/work" }),
  schema: z.object({
    /** Display order on the /work index (lowest first). */
    order: z.number(),
    /** Full <title> for the page head (anonymised — never the named client). */
    title: z.string(),
    /** Meta description (anonymised). */
    description: z.string(),
    /** Page-hero eyebrow + index tile plate. */
    kicker: z.string().default("case file"),
    /** H1, lowercase, with at most one amber <em>. */
    heading: z.object({
      before: z.string().optional(),
      em: z.string().optional(),
      after: z.string().optional(),
    }),
    /** The always-on `.src` descriptor (anonymised, e.g. "a national contact centre"). */
    descriptor: z.string(),
    /** Page-hero standfirst under the H1. */
    lead: z.string(),
    /** The /work index tile's outcome line (the draft's 60-second hook). */
    tileOutcome: z.string(),
    /**
     * Freshness signals for Article schema (answer engines weight recency
     * heavily). Optional so existing entries keep building; add `datePublished`
     * (and `dateModified` when revised) to emit dates. `z.coerce.date()` accepts
     * a plain "YYYY-MM-DD" string in frontmatter. If omitted, no date is emitted
     * — never a fabricated one.
     */
    datePublished: z.coerce.date().optional(),
    dateModified: z.coerce.date().optional(),
    /** Prefilled mailto subject for this page's CTAs. */
    contactSubject: z.string(),
    /** The page's footer "let's talk" invitation (carries the draft's "the ask"). */
    footerInvitation: z.string(),
    /**
     * Build-time gate. Default OFF — the named client + quote below are only
     * rendered when this is true AND written client permission has landed
     * (06-permissions-to-seek-addendum.md). Never render-then-CSS-hide.
     */
    namePublished: z.boolean().default(false),
    /** Named tier: shown only when namePublished is true. */
    named: z
      .object({
        client: z.string(),
        quote: z.string(),
        cite: z.string(),
      })
      .optional(),
  })
    .superRefine((d, ctx) => {
      // Security invariant, enforced at the layer the repo trusts (astro
      // check/build): a committed `named` block with the gate closed is a
      // source leak — git history is public even when the build never
      // renders it. The named tier stays OUTSIDE the repo until the flip.
      if (d.named && !d.namePublished) {
        ctx.addIssue({
          code: "custom",
          path: ["named"],
          message:
            "named tier committed while namePublished is false — client names must never enter this public repo before written permission lands (history leaks beat the render gate). Hold the named block in design/copy/ until the flip.",
        });
      }
      // A heading with no text renders an empty H1, an empty Article headline,
      // and an empty /work tile — and no gate downstream would notice.
      if (!(d.heading.before || d.heading.em || d.heading.after)) {
        ctx.addIssue({
          code: "custom",
          path: ["heading"],
          message: "heading needs text — before/em/after are all empty/absent",
        });
      }
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/blog" }),
  schema: z
    .object({
      /** Full <title> for the page head. */
      title: z.string(),
      /** Meta description — also the /blog index tile's body line. */
      description: z.string(),
      /** Page-hero eyebrow + index tile plate. */
      kicker: z.string().default("field note"),
      /** H1, lowercase, with at most one amber <em>. */
      heading: z.object({
        before: z.string().optional(),
        em: z.string().optional(),
        after: z.string().optional(),
      }),
      /** Page-hero standfirst under the H1. */
      lead: z.string(),
      /**
       * Publication date — drives the index order (newest first), the visible
       * dateline, and the Article schema's freshness signal. Required: a note
       * without a date has no place in the order. `z.coerce.date()` accepts a
       * plain "YYYY-MM-DD" string in frontmatter; add `dateModified` when a
       * post is revised.
       */
      datePublished: z.coerce.date(),
      dateModified: z.coerce.date().optional(),
      /** Prefilled mailto subject for this page's CTAs. Omit for a bare mailto. */
      contactSubject: z.string().optional(),
      /** The page's footer "let's talk" invitation. Omit for the site default. */
      footerInvitation: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      // Same invariant as `work`: an all-empty heading renders an empty H1 and
      // an empty Article headline, and no gate downstream would notice.
      if (!(d.heading.before || d.heading.em || d.heading.after)) {
        ctx.addIssue({
          code: "custom",
          path: ["heading"],
          message: "heading needs text — before/em/after are all empty/absent",
        });
      }
    }),
});

export const collections = { work, blog };
