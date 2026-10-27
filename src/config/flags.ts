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
 * `showTrainingPrices` gates the training catalogue's prices. No training price
 * has a recorded ruling yet, so the safe variant (price on request) is the
 * default and the only one CI builds. Setting SHOW_TRAINING_PRICES=true at
 * build time shows the figures from the private ops file; see
 * src/config/training.ts for why the figures never enter this repository.
 */
export const flags = {
  showTrainingPrices: process.env.SHOW_TRAINING_PRICES === "true",
} as const;

export type Flags = typeof flags;
