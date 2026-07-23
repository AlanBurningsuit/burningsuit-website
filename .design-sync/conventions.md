# burningsuit — design conventions

This project ships **styles only** (no component bundle): the compiled CSS, tokens, and self-hosted fonts of burningsuit.co.uk, an Astro static site. Build your own markup; style it entirely with the tokens and classes below. The look is "the field notebook": a flat Everforest-green dark ground, cream used only for proof/evidence panels, one magenta pop. **No gradients, no glow effects, nothing that idles or loops.**

## Setup

No provider or wrapper. `styles.css` already grounds the page: `html` gets `background: var(--bg)` and `body` gets the foreground colour, Albert Sans, and the fluid body size automatically. Two traps:

- **Never add a `js` class to `<html>`** — rules gated on `.js` hide content until a scroll-reveal script (not included) shows it.
- **Never use `.cta-footer`** — it position-fixes a full-width footer basement that will sit over your design.

## Styling idiom: tokens only, semantic classes

Every value comes from a `var(--*)` token — no magic numbers, hex colours, or ad-hoc font sizes. The vocabulary:

**Colour roles** — `--bg` ground · `--bg-2` raised surface · `--fg` text · `--fg-dim` muted text · `--line` hairline divider · `--deep` carved border/shadow · `--paper`/`--ink`/`--ink-soft` cream panel surface + its heading/body ink (cream is for proof panels only, never a general background) · `--amber` links + warmth · `--moss` quiet positive, sparing · `--spark` the magenta pop — CTAs and the brand thread ONLY, never body text.

**Type** — three families: `--ff-display` (Mona Sans, headings), `--ff-body` (Albert Sans, default), `--ff-mono` (Commit Mono, instrument labels). Sizes are a fluid ladder: `--fs-7` page hero → `--fs-4`/`--fs-2`/`--fs-1` headings → `--fs-lead` → `--fs-base` body → `--fs-sm` secondary. Mono labels use their own three-step scale: `--mono-fine`/`--mono-label`/`--mono-lead`. Pair headings with `line-height: var(--lh-display)` and `letter-spacing: var(--ls-display)`; mono with `letter-spacing: var(--ls-mono)` or `--ls-mono-wide`.

**Space & shape** — spacing scale `--space-3xs` … `--space-md` (default gap before a block) … `--space-super` (section step); `--gutter` for page inline padding; reading measures `--measure-prose`/`--measure-wide`; radius `--r`/`--r-sm`; carved-edge width `--px`; hairline `--bw-hair`. Media queries sit on a 48rem / 56rem / 62rem ladder.

**Semantic classes** (use these before inventing your own): `.wrap` page container · `.kicker` mono eyebrow · `.meta` mono meta line · `.lead` lede paragraph · `.prose` reading-measure rich text (its `em` renders amber, not italic) · `.panel` cream dot-grid proof panel with carved edge (put content in a child `.body`) · `.aside` mono side-note with accent spine · `.chip` small label chip · `.tab` mono tab label · `.qlist` question list · `.section-head` section heading row · `.band-2` raised full-bleed band · `.cta` the magenta primary button · `.ghost` quiet secondary button · `.go` arrow link.

## Where the truth lives

Read `tokens/tokens.css` first — it is the annotated token source (every scale, with comments on intent). `_ds_bundle.css` is the site's full compiled CSS and the authority on what each class does. `fonts/fonts.css` carries the @font-face rules; the family stacks are exposed as `--font-mona`/`--font-albert`/`--font-commit` and pre-wired into the `--ff-*` tokens.

## Idiomatic example

```html
<main class="wrap" style="padding-block: var(--space-super);">
  <p class="kicker">Field notebook · example</p>
  <h2 style="font-family:var(--ff-display); font-size:var(--fs-4);
             line-height:var(--lh-display); letter-spacing:var(--ls-display);">
    A heading on the ground</h2>
  <p class="lead" style="max-width:var(--measure-prose); margin-top:var(--space-md);">
    Body copy in Albert Sans.</p>
  <div class="panel" style="max-width:28rem; margin-top:var(--space-md);">
    <div class="body">
      <p class="meta">proof · panel</p>
      <h3 style="font-family:var(--ff-display); font-size:var(--fs-2);">Cream is for evidence</h3>
    </div>
  </div>
  <p style="margin-top:var(--space-md);"><a class="cta" href="#">Book a call</a></p>
</main>
```
