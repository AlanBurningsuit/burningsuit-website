/**
 * Build-time content flags.
 *
 * These resolve copy decisions that are signed-but-open or gated on an external
 * sign-off. The signed/safe variant is the default in every case, and the
 * alternative is chosen here at build time — content is never rendered then
 * hidden (that would leak via "view source" and defeat the point of gating).
 *
 * See design/copy/{home,power-bi}.md "STILL OPEN" / "PERMISSION-PENDING".
 */
export const flags = {
  /**
   * Hero emphasis word on the homepage: which word takes the serif-italic.
   * B5 re-fit (15 Jun) currently italicises "still" — it softens the edge Alan
   * flagged. Alternative under test is "job". Decide on the screenshot.
   * home.md §2 / STILL OPEN #2.
   */
  heroItalic: "still" as "still" | "job",

  /**
   * /power-bi proof block (§5): name the anchor client and show the
   * quote. Default OFF — the anonymous version ships until written permission
   * lands (design/copy/03-permissions-to-seek.md). The anonymous paragraph is
   * the same evidence at an altitude that needs no sign-off.
   */
  proofNamed: false,

  /**
   * /power-bi "what i don't do" (§6): include the "sheep-dip training" line.
   * Default OFF pending Alan's call — it lightly disparages a training format
   * his parents' business was known for, so it sits awkwardly. The rest of the
   * section (no public courses; learning sticks on real data) ships regardless.
   * power-bi.md §6 / ROUND 2 #2.
   */
  sheepDip: false,
} as const;

export type Flags = typeof flags;
