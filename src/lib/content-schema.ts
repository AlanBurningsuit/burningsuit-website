import { z } from "astro/zod";

// Public copy is anonymous. An open source gate is never permission to name a client.
const text = z.string().trim().min(1);
const heading = z.union([
  text,
  z.object({ before: z.string().optional(), em: z.string().optional(), after: z.string().optional() }).strict()
    .refine((value) => [value.before, value.em, value.after].some((part) => part?.trim()), "heading needs text"),
]);
const link = z.object({ text, href: z.string().regex(/^\/[a-z0-9/-]*(#[a-z0-9-]+)?$/, "must be a site path") }).strict();
const action = link.extend({ hint: text.optional() }).strict();

// Every study has one shape (CaseStudyLayout.astro): heading, lead, the same four facts, its sections, a limits line
// and one closing band. Unknown keys fail closed.
export const workSchema = z.object({
    category: z.enum(["courses", "coaching", "consultancy"]),
    order: z.number(),
    title: text,
    description: text,
    heading,
    /** A plain name for lists and links, when it should differ from the page's own heading. */
    linkLabel: text.optional(),
    descriptor: text,
    lead: text,
    facts: z.object({ format: text, who: text, length: text, material: text }).strict(),
    /** What the study shows and what it doesn't. */
    limits: text,
    /** The way back to the offer: a main link and a quieter one, each with an optional hint. */
    closing: z.object({ heading: text, body: text, link: action, then: action }).strict(),
    datePublished: z.coerce.date().optional(),
    dateModified: z.coerce.date().optional(),
    ogImage: z.string().regex(/^\/social\/linkedin-work-[a-z0-9-]+\.png$/).optional(),
    namePublished: z.boolean().default(false),
    named: z.object({ client: text, quote: text, cite: text }).strict().optional(),
  }).strict().superRefine((study, ctx) => {
    if (study.named && !study.namePublished) {
      // Never echo the value in a validation message.
      ctx.addIssue({ code: "custom", path: ["named"], message: "named block requires an open publication gate; keep private material outside this public repo" });
    }
  });

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// Fixed public paths are selected from the entry ID in writing-routes.mjs. `kind: archive` puts an entry in the
// Writing index's "From the archive" list; every other entry joins the main list.
export const writingSchema = z.object({
    kind: z.enum(["essay", "archive"]),
    author: z.enum(["Alan Harman-Box", "Stuart Box", "Alison Box"]),
    title: text, description: text,
    /** The Writing index's line for the entry, when it should differ from the meta description. */
    summary: text.optional(),
    // An archive post's heading is plain unless its own title marks a word.
    heading: z.union([text, z.object({ before: z.string().optional(), em: text, after: z.string().optional() }).strict()]),
    lead: text.optional(), kicker: text.default("Essay"),
    archiveMonth: month.optional(),
    /** The month an archive post's own author revised it, as its byline shows. */
    revisedMonth: month.optional(),
    /** The line under an archive post's byline saying it carries dated update notes. */
    updateNotice: text.optional(),
    datePublished: z.coerce.date().optional(), dateModified: z.coerce.date().optional(),
    givenAt: z.array(z.object({ event: text, date: z.coerce.date() }).strict()).optional(),
  }).strict().superRefine((essay, ctx) => {
    // An archive post keeps its original author and the date precision its source gives: a month or a day, not both.
    if (essay.kind === "archive" && (essay.author === "Alan Harman-Box" || !essay.archiveMonth === !essay.datePublished || essay.dateModified || essay.givenAt)) {
      ctx.addIssue({ code: "custom", message: "archive entries require their original author and either a month or a day of publication, without modification dates or appearances" });
    }
    if (essay.kind === "essay" && (essay.author !== "Alan Harman-Box" || !essay.lead || essay.archiveMonth || essay.revisedMonth || essay.updateNotice || typeof essay.heading === "string")) {
      ctx.addIssue({ code: "custom", message: "essays require their author, lead and marked heading, without archive context" });
    }
    if (essay.revisedMonth && (!essay.datePublished || essay.revisedMonth <= essay.datePublished.toISOString().slice(0, 7))) {
      ctx.addIssue({ code: "custom", path: ["revisedMonth"], message: "revisedMonth must follow the day-level datePublished" });
    }
    if (essay.dateModified && !essay.datePublished) {
      ctx.addIssue({ code: "custom", path: ["dateModified"], message: "dateModified requires the original datePublished" });
    }
    if (essay.datePublished && essay.dateModified && essay.dateModified < essay.datePublished) {
      ctx.addIssue({ code: "custom", path: ["dateModified"], message: "dateModified must not precede datePublished" });
    }
  });
