import { z } from "astro/zod";

// Public copy is anonymous. An open source gate is never permission to name a client.
const text = z.string().trim().min(1);
const heading = z.union([
  text,
  z.object({ before: z.string().optional(), em: z.string().optional(), after: z.string().optional() }).strict()
    .refine((value) => [value.before, value.em, value.after].some((part) => part?.trim()), "heading needs text"),
]);
const link = z.object({ text, href: z.string().regex(/^\/[a-z0-9/-]*(#[a-z0-9-]+)?$/, "must be a site path") }).strict();
const common = z.object({
  order: z.number(),
  title: text,
  description: text,
  heading,
  descriptor: text,
  datePublished: z.coerce.date().optional(),
  dateModified: z.coerce.date().optional(),
  ogImage: z.string().regex(/^\/social\/linkedin-work-[a-z0-9-]+\.png$/).optional(),
  namePublished: z.boolean().default(false),
  named: z.object({ client: text, quote: text, cite: text }).strict().optional(),
});

// Presentation variants retain the independently approved notebook compositions.
// Unknown keys fail closed; unused future-index fields never become public copy.
export const workSchema = z.discriminatedUnion("presentation", [
    common.extend({
      presentation: z.literal("chapters"), kicker: text, lead: text, tileOutcome: text,
      contactSubject: text, footerInvitation: text, footerLink: link,
    }).strict(),
    common.extend({
      presentation: z.literal("story"), lead: text, tileOutcome: text.optional(),
      facts: z.array(z.object({ label: text, value: text }).strict()).min(1),
      next: z.object({ heading: text, body: text, link, then: link.extend({ hint: text.optional() }).strict().optional() }).strict(),
    }).strict(),
    common.extend({
      presentation: z.literal("coaching"), lead: text, tile: text,
      facts: z.object({ label: text, rows: z.array(z.object({ term: text, detail: text }).strict()).min(1) }).strict(),
      returnLinks: z.array(link).min(1),
    }).strict(),
    common.extend({ presentation: z.literal("course"), facts: z.array(text).min(1) }).strict(),
  ]).superRefine((study, ctx) => {
    if (study.named && !study.namePublished) {
      // Never echo the value in a validation message.
      ctx.addIssue({ code: "custom", path: ["named"], message: "named block requires an open publication gate; keep private material outside this public repo" });
    }
    if (study.presentation === "chapters" && study.footerInvitation.split(study.footerLink.text).length !== 2) {
      ctx.addIssue({ code: "custom", path: ["footerLink", "text"], message: "footerLink.text must occur exactly once in footerInvitation" });
    }
  });

// No old essay body is restored. Entries will follow a separate copy approval.
export const writingSchema = z.object({
    title: text, description: text,
    heading: z.object({ before: z.string().optional(), em: text, after: z.string().optional() }).strict(),
    lead: text, kicker: text.default("Essay"),
    datePublished: z.coerce.date().optional(), dateModified: z.coerce.date().optional(),
    contactSubject: text, footerInvitation: text,
    givenAt: z.array(z.object({ event: text, date: z.coerce.date() }).strict()).optional(),
  }).strict().superRefine((essay, ctx) => {
    if (essay.dateModified && !essay.datePublished) {
      ctx.addIssue({ code: "custom", path: ["dateModified"], message: "dateModified requires the original datePublished" });
    }
    if (essay.datePublished && essay.dateModified && essay.dateModified < essay.datePublished) {
      ctx.addIssue({ code: "custom", path: ["dateModified"], message: "dateModified must not precede datePublished" });
    }
  });
