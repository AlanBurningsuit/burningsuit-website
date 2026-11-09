# burningsuit.co.uk: rules for agents

This file tells agents (Claude Code reads `CLAUDE.md`, Codex reads `AGENTS.md`, a symlink to it) what the site is for, which source owns which decision, and what must never happen. How the code works is in [README.md](README.md).

`burningsuit.co.uk` is Alan Harman-Box's solo-practice website: it helps the right people understand what Alan does, trust it, and enquire or book. Everything on it must be true, permitted and recognisably Alan. **burningsuit** is always lowercase. Keep the site fast, accessible and private.

## Where decisions live

The ops and brand repos are private siblings of this checkout (`../burningsuit-ops`, `../burningsuit-brand`). From a worktree, use the absolute paths under `~/Projects/`.

| Decision | Owner |
| --- | --- |
| Audience, offers, page jobs, navigation, routes, naming and open questions | `burningsuit-ops/site/current-brief.md` (its dated history is `site/decisions.md`) |
| Course catalogue and scope | The course's Outline in `~/vaults/Mazarbul/Practice/Training/` (`Training.md` is the index) |
| Approved page wording | The page's copy file in `burningsuit-ops/site/` (the brief's page table links each one) |
| What copy must not say | `burningsuit-ops/brand/claims-ledger.md` |
| Legal details, URLs and Alan's background, to copy exactly | `burningsuit-ops/site/reference.md` |
| Voice and vocabulary | `burningsuit-brand/voice/README.md` and `voice/lexicon.md`, applied by the `burningsuit-copy` skill |
| Visual identity and shared tokens | `burningsuit-brand/README.md` and `brand.css` |
| Page composition and patterns | `burningsuit-ops/site/design-direction.md`; the built code supersedes it pattern by pattern |
| Engineering | The code and [README.md](README.md); the code wins over a description of it |

If a source you need is missing, or a Practice decision or Training note is newer than the brief's as-of date, flag it before writing or reviewing copy. Don't fill gaps from old drafts, archived reviews, process records or git history.

## Authority, highest first

1. Hard constraints: privacy, permissions, truthfulness, the gate, the functional tests and the push hook.
2. Alan's current instructions. Record a scope or offer change in its owning source before continuing copy work; website decisions go in the brief.
3. The brief, for audience, offer, page jobs and settled or open questions.
4. Skills, reviews and recommendations. Flag conflicts; they never silently change an offer.

## Never

- **Nothing private in this repo.** It is public, history and commit messages included. No client names, permission states, training prices or internal economics. Source comments may say where private evidence lives, never what it says.
- **No invented claims.** No claim, metric, quote, date or profile URL without a source (the brief, an Outline, a dated Practice decision, the reference sheet or Alan), and none that crosses the ledger.
- **No named client** without Alan's go-ahead, and no named text staged on a preview. `namePublished: true` renders nothing by itself; the schema rejects a `named` block while its gate is closed.
- **No prices in tracked files.** Prices render only from the private `design/copy/training-prices.json` with `SHOW_TRAINING_PRICES=true` (see the README). Changing prices, the ledger or payment setup needs its own approval.
- **No new legacy redirect** without checking the vault's slug list: some old URLs stay 404 on purpose because their slugs identify clients. Consultancy stays at `/power-bi/` with its anchors.
- **No client-side rendering.** Static output only: no SSR, islands or client-rendered content or JSON-LD. Structured data goes through `src/components/seo/Schema.astro`.
- **No Umami settings changes.** Analytics are read-only. Dashboard: `https://cloud.umami.is/analytics/eu/websites/7a27ff45-e9ce-4aec-8940-260c61c35dff`.
- **No push without asking.** Commit checked work locally and ask before every push. Any pushed branch can be public through a preview; `main` publishes the live site. Keep the push hook enabled.

## How work runs

| Kind of change | Route |
| --- | --- |
| **Small edit:** a typo, a consistency fix between pages, a broken or wrong link | Edit; run the copy lint on the changed file (`node ~/Projects/burningsuit-brand/scripts/lint-copy.mjs <file>`); update any test that pins the old wording; run the gate and functional tests; get one line of approval from Alan with the before and after. No page workflow or council. |
| **Page work:** new or reworded copy, a new page, a layout change | The `burningsuit-page-workflow` skill, when Alan asks for it. |
| **Engineering** with no visible change | Read the README's relevant sections, then edit, check and commit. |

A small edit never adds a claim, changes an offer, price or permission, or introduces wording beyond the fix. If it would, it is page work.

Use brand tokens and existing styles; a shared visual change starts in the brand repo. Keep this file to rules and pointers; history belongs in git and the ops repo's `site/decisions.md`.
