/** A case study's heading as plain text, for lists and links: the string itself, or its parts joined. */
export const headingText = (heading: string | { before?: string; em?: string; after?: string }) =>
  typeof heading === "string" ? heading : [heading.before, heading.em, heading.after].filter(Boolean).join("");
