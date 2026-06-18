/**
 * Build-time content flags.
 *
 * These resolve copy decisions that are signed-but-open or gated on an external
 * sign-off. The signed/safe variant is the default in every case, and the
 * alternative is chosen here at build time — content is never rendered then
 * hidden (that would leak via "view source" and defeat the point of gating).
 *
 * Case-study naming (the law firm and the rest) used to live here as
 * `proofNamed`. It now lives per-study in the `work` content collection's
 * `namePublished` frontmatter (src/content/work/*.mdx), so the /power-bi proof
 * teaser and the full /work/<slug> page share one gate and can't drift. Same
 * doctrine: the named client + verbatim quote are only rendered when the boolean
 * is true AND written permission has landed.
 *
 * This object is kept (empty) as the home for any future build-time copy flag.
 */
export const flags = {} as const;

export type Flags = typeof flags;
