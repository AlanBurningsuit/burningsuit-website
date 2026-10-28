# AGENTS.md

Orientation for anyone, human or AI, working in this repo. This is the single instructions file: `CLAUDE.md` only imports it.

## The goal

`burningsuit.co.uk` is the website for **Alan Harman-Box's solo practice**: a way for the right people to understand what Alan does, trust it, and get in touch or book. Lowercase **burningsuit**, always.

Everything on it has to be true, permitted and recognisably Alan. The site stays fast, accessible and private. Those hold whatever the offer is this month; the offer itself lives in the brief, not here. Describe intent here, not progress: branch status, sign-off history and release records belong in git and the private ops repo, not in this file.

## Where to look

| Need | Source | Status |
| --- | --- | --- |
| What the site is for right now: readers, offer, settled and open questions | `../burningsuit-ops/site/current-brief.md` | **Authoritative** for scope and offer |
| Writing, editing or reviewing copy as Alan | `../burningsuit-ops/skills/writing-like-alan/SKILL.md` + the website playbook | Authoritative for voice |
| Facts, claims, permissions, what must never be said | `../burningsuit-ops/brand/claims-ledger.md`, `../burningsuit-ops/site/publication-checks.md` | Authoritative for evidence and privacy |
| Engineering, release, commands | This file, then the code itself | The code wins over any doc describing it |
| Alan's live positioning notes (outside this repo; the brief names its sources) | Linked from the brief | **Input, not authority.** Never write copy from them directly |

`../burningsuit-ops` is a private sibling repo, reached locally through the gitignored `design/` junction. If it or the brief is missing, or the brief is older than a decision it should reflect, say so before writing or reviewing copy. Don't fill the gap from old drafts, archived reviews or git history.

## When guidance conflicts

Authority runs in this order:

1. **Hard constraints:** privacy, client permissions, never fabricating, and the deterministic gates (`npm run gate`, `npm run test:functional`, the push hook). Nothing overrides these: not the brief, not a reviewer, not a request in passing.
2. **Alan, in the current session.** His instruction wins, but if it changes scope or offer, note that the brief needs updating rather than treating the session as a new brief.
3. **The brief**, for audience, offer, page purpose and what's settled or open.
4. **Everything else:** skills, reviewer findings, SEO/AEO advice, design notes, old approvals, best practice. These advise; they don't decide.

When a suggestion or piece of guidance goes against the brief, don't silently follow it and don't silently drop it. Follow the brief, and raise the conflict with Alan in a line: what the suggestion said, what the brief says, and which you followed. If the brief itself looks wrong or stale, say that too; don't route around it. An open question in the brief stays open: copy must not guess at it (e.g. a price that hasn't been decided).

## Content invariants

- Never fabricate a claim, metric, quote, client name, date or profile URL. A claim not backed by the ledger or a named source doesn't ship.
- Anonymised-first. **`namePublished` is a security gate:** a named client or quote renders only when `true` AND written permission has landed. The Zod schema in `src/content.config.ts` fails the build if a `named` block is committed while the gate is false. Named-tier text lives only in the private ops repo; never paste it into tracked files or stage it on a preview (`dev` is public).
- Nothing private crosses into this public repo: no client names, permission states, undecided prices or internal economics, not even in comments or commit messages. `design/` and `resources/` are gitignored; builds degrade gracefully without them (CI, fresh clones).
- **Redirect, never resurrect:** legacy WordPress URLs get redirect stubs to `/power-bi/`, `/about/` or `/work/`. One exception: Stuart's 2021 Roche's Maxim post lives at its original `/blog/2021/03/…` URL because Matthew Roche's write-up links to it; `check-seo` enforces it.
- **Some legacy URLs stay 404 on purpose** because a redirect would put identifying text in public source. The list is private. Never "fix" a legacy 404 without checking it isn't one of them.
- Reviewers are read-only; nothing auto-publishes. Commit checked work locally; ask before any push.

## Site shape

Static **Astro 6** (`output: "static"`), **Tailwind v4** via PostCSS, MDX collections, self-hosted fonts. No SSR, no JS framework or islands, no client-side rendering of content. Deployed to GitHub Pages via Actions. The visual language is "the field notebook"; all styles live in `src/styles/` (`tokens.css` + `app.css`).

- **Two content tracks:** case studies (`/work/<slug>/`) and essays (`/writing/<slug>/`) are `.mdx` entries in the `work` / `writing` collections (schema in `src/content.config.ts`; the filename is the slug, the route and tile are automatic). Standing top-level pages are bespoke `.astro` under `src/pages/` with no data layer. Don't build a case study as a bespoke page or a standing page as MDX.
- `/writing/` redirects to its only essay until a second one warrants an index; `check-seo` enforces that.
- **Training:** `/training/` is the catalogue; course facts live in `src/config/training.ts`. Prices are build-gated: they render only with `SHOW_TRAINING_PRICES=true` **and** the private `design/copy/training-prices.json` present, so CI and Netlify always build the price-on-request variant. Never add a price figure to tracked source.
- **Consultancy** is `/power-bi/` (URL kept for its history). Existing anchors on it stay valid; check links before removing an `id`.
- Booking buttons go straight to Cal.com; the URL lives in `BOOKING_URL` in `src/config/site.ts`.
- **JSON-LD** is emitted server-side by `src/components/seo/Schema.astro` from `src/config/site.ts` + `src/lib/schema.ts` + page frontmatter. Never hand-paste it or emit it client-side. Schema mirrors visible content; Alan's LinkedIn belongs only on the Person's `sameAs`. The SEO gate checks this.

## Branches and deploy

- **`main` is production.** Whatever lands there deploys to the live apex via `deploy.yml`. A merge to `main` IS a production deploy; there is no "inert until switched" safety.
- **`dev`** is integration. Work on short-lived `feat/`/`fix/` branches off `dev`, merge back to integrate.
- **Netlify previews any pushed branch** at `<branch>--<site>.netlify.app` (hard-noindexed), so never merge to `dev` just to get a preview.

`deploy.yml` (on push to `main`) runs `npm ci` on Node 22, `npm run gate`, installs Playwright Chromium with OS dependencies, runs `npm run test:functional` against the built `dist/`, then uploads that same tested artifact without rebuilding. Only its deployment job can publish, guarded to `main`. `validate.yml` runs the same checks without publishing for PRs to `dev`/`main` and pushes to `dev`.

Go-live is one move: merge `dev` → `main`. Before it: gate and functional tests green on `dev`, visual and Lighthouse checks done, the preview eyeballed. After it: watch the Action and check the live apex. Roll back by reverting the merge commit on `main`.

The pre-Astro legacy site is the `legacy-site-backup` tag. History was purged on 2026-07-02 (`git filter-repo`), so pre-purge SHAs in old notes are stale.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | prep:images + `astro build` + byte-budget gate (must pass) |
| `npm run gate` | astro check → build (+budget) → link check → SEO/JSON-LD assertions |
| `npm run test:functional` | type-check tests/, then Chromium behaviour checks against the existing `dist/`; does not rebuild |
| `npm run preview` | serve the built `dist/` |
| `npm run test:visual` | type-check tests/, then Playwright snapshots (chromium + firefox + 390px mobile) |
| `npm run test:visual:update` | refresh snapshot baselines after an intentional visual change, then re-run `test:visual` |
| `npm run test:lh` / `npm run test:links` | Lighthouse + link check |
| `npm run test:lh:mobile` | three mobile audits each for Home and Power BI, including analytics |

Node 22.20+ (`.nvmrc`). Lighthouse audits the existing build; rebuild after source changes.

## Gotchas

- **Files must be LF** (`.gitattributes`). CRLF breaks Astro's CSP byte-hashing, and the failure looks unrelated.
- **Design tokens only:** use `var(--*)` from `src/styles/tokens.css` and existing classes in `app.css`; add or reuse a token, never hardcode a value. Breakpoints stay literal on the **48 / 56 / 62rem** ladder (media queries can't read custom properties). No gradients, glow, serif italics, magenta body text, custom cursors, or anything that idles or loops.
- **Photos:** `resources/` holds the raw sources (gitignored). `scripts/prep-images.mjs` regenerates `src/assets/photos` from them as the first build step, and skips when they're absent (CI uses the committed derivatives). After changing a source photo, rebuild and commit the derivatives.
- **Renaming or removing a route?** Add a redirect for the old path in the `redirects` block in `astro.config.mjs`. The SEO gate checks every stub's target exists, but only a human knows an old path needs an entry. Stubs are meta-refresh pages (all GitHub Pages supports), excluded from the sitemap.
- **Port-4321 zombie:** Playwright's `webServer` reuses any listener on :4321, so a stray `astro dev`/`preview` makes the suite test dev pages silently (every CSP test times out, baselines capture the wrong render). Before `test:visual`, check `Get-NetTCPConnection -LocalPort 4321 -State Listen` and kill the owner.
- **Agents on Windows:** the Bash tool wedges on git in this repo (~120s timeouts); use PowerShell with `git --no-optional-locks`.
- **Visual baselines are Windows-only** and stay out of Linux CI. Refresh them only after reviewing intentional differences, then rerun. Known flakes: LHCI EPERM on Windows teardown (scores still valid), occasional Firefox stalls under parallel load (workers capped at 4), the `about-dog` clip-path snapshot.
- **Analytics looks dead?** A local DNS filter on Alan's network can block analytics hosts. Test from an unfiltered connection before debugging the site.
- **The push hook** (`.claude/hooks/publish-readiness.mjs`, local to Alan's checkout and not tracked) blocks an agent's `git push` of site changes unless `npm run gate` passes. Keep it enabled.
