import type { CollectionEntry } from "astro:content";

/**
 * THE namePublished gate — the one audited derivation of a study's named tier.
 *
 * Returns the named block (client + verbatim quote + cite) only when the
 * study's `namePublished` is true AND the block exists; undefined otherwise,
 * including when the study itself is missing (a renamed/removed entry fails
 * safe in the anonymising direction). Build-time only: while this returns
 * undefined, nothing named reaches the static HTML.
 *
 * Never re-derive this inline. Casefile routes through here, so the
 * permission decision remains in one testable place when a named
 * testimonial is added.
 */
export function namedTier(
  study?: CollectionEntry<"work">["data"],
): CollectionEntry<"work">["data"]["named"] {
  return study?.namePublished ? study.named : undefined;
}
