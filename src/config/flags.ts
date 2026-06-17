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
   * /power-bi proof block (§5): name the anchor client and show the
   * quote. Default OFF — the anonymous version ships until written permission
   * lands (design/copy/03-permissions-to-seek.md). The anonymous paragraph is
   * the same evidence at an altitude that needs no sign-off.
   */
  proofNamed: false,
} as const;

export type Flags = typeof flags;
