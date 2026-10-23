# burningsuit — design conventions

The design import contains styles, tokens and self-hosted fonts from the Astro site. It supplies no component library or JavaScript runtime. Build markup with the existing tokens and semantic classes. The field-notebook design uses an Everforest-green ground, cream evidence panels and a restrained magenta accent. Keep existing figure-specific artwork exceptions; do not add ambient loops, glow or gradients to the site furniture.

## Source and exported snapshot

In this repository, `src/styles/tokens.css` defines the scales and `src/styles/app.css` defines class behaviour. `src/layouts/BaseLayout.astro` supplies fonts and loads `src/scripts/enhance.ts`. Those source files take precedence over an older imported bundle.

In a styles-only export, `styles.css` loads the compiled stylesheet and `fonts/fonts.css`; `tokens/tokens.css` is the annotated source reference. Its Tailwind `@theme` declarations are not a standalone browser stylesheet. The `--font-mona`, `--font-albert` and `--font-commit` declarations must accompany the fonts because the semantic family tokens depend on them.

## Runtime and footer

The running site adds `html.js` from its enhancement module when `IntersectionObserver` is available. That activates scroll reveals and the sticky footer; no-JavaScript, reduced-motion and print states remain readable. Preserve the runtime's ownership of this class when editing the site. In a styles-only consumer without the module, leave the class unset so content remains visible.

`.cta-footer` only spaces the footer's booking row. The `footer` element remains in document flow and becomes sticky under `html.js` when motion is allowed. Focus returns it to ordinary positioning. It is not a fixed overlay; use the current footer markup and styles when reproducing the site's behaviour.

## Tokens and classes

Use existing tokens for colour, type, spacing, shape and motion. Add a token in the source when a new value is necessary. Keep literal media queries on the 48 / 56 / 62rem ladder.

| Role | Vocabulary |
|---|---|
| Colour | `--bg`, `--bg-2`, `--bg-dim`, `--fg`, `--fg-dim`, `--line`, `--deep`; `--paper`, `--ink`, `--ink-soft` for evidence; `--amber` for links, `--moss` for quiet positive detail and `--spark` for the brand accent |
| Type | `--ff-display` (Mona Sans), `--ff-body` (Albert Sans), `--ff-mono` (Commit Mono); the `--fs-*` and `--mono-*` scales, with `--lh-*` and `--ls-*` |
| Space and shape | `--space-*`, `--gutter`, `--measure-*`, `--r`, `--r-sm`, `--px` and `--bw-*` |
| Structure | `.wrap`, `.section-head`, `.kicker`, `.meta`, `.lead`, `.prose`, `.aside` |
| Evidence | `.panel` with a `.body` child, `.tab`, `.chip` |
| Links and controls | `.cta`, `.ghost`, `.route` for standalone routes and `.go` for a card's closing route label |

Ordinary prose links are underlined; `.route` supplies its arrow through CSS. Use `.ghost` for the email alternative. `.prose em` uses amber emphasis rather than italics. Read the current stylesheet before adopting a class whose behaviour depends on surrounding markup.

```html
<section class="wrap" style="padding-block: var(--space-super);">
  <p class="kicker">Field notebook · example</p>
  <h2>A heading on the ground</h2>
  <div class="prose" style="margin-top: var(--space-md);">
    <p>Body copy in Albert Sans.</p>
  </div>
  <div class="panel" style="max-width: var(--measure-prose); margin-top: var(--space-md);">
    <div class="body">
      <p class="meta">Proof · panel</p>
      <h3>Cream is for evidence</h3>
    </div>
  </div>
</section>
```
