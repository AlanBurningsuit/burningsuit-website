\# burningsuit.co.uk



The burningsuit company website. Small project, single owner (Alan), deployed

on Cloudflare Pages with DNS at Mythic Beasts. This file is the project

orientation — read it first, then the brand guidelines PDF in this folder.



\## Current state



\*\*Phase 1: static placeholder.\*\* A single-page holding site that signals the

company is operating, provides contact details, and indicates a new site is

on the way. Phase 1 exists because the previous site is going offline on

\*\*1 June 2026\*\* and a real replacement isn't ready yet. The placeholder buys

time without leaving the domain dark.



\*\*Phase 2: the actual site.\*\* Scope, content, and structure all to be decided.

Likely a small static site (handful of pages, no CMS). Astro is the current

default candidate for the generator but no commitment has been made — if a

single hand-written page covers the brief, that's also fine.



When working on this project, always confirm which phase the current request

relates to. Don't pre-empt Phase 2 decisions while building Phase 1.



\## Brand



The authoritative source is `Burningsuit\_Brand\_Guidelines\_V1.pdf` in this

folder. \*\*Read it before doing any visual work.\*\* Logo files (when present)

live in `logos/`. Always prefer the official SVG over reconstructions.



\### Quick reference



\*\*Colours\*\* (exact values, do not approximate):



| Name | Hex | Pantone | Use |

|---|---|---|---|

| Aubergine | `#431233` | 5115 | Primary background |

| Magenta | `#D90148` | 1935 | Logo mark, strong accents |

| Orange | `#F3A44C` | 7411 | Warm accent, highlights, links |

| Mauve | `#B5A4AF` | — | Supporting; muted text |

| Bone | `#EBEBEB` | — | Supporting; light surfaces |



\*\*Typography:\*\*



\- \*\*Objektiv Mk1 Bold\*\* — headings. Available via Adobe Fonts.

\- \*\*Bilo Medium / Regular\*\* — intro copy and body. Available via Adobe Fonts.

\- \*\*Arial\*\* — fallback when neither is available (per the brand guide).



If Adobe Fonts isn't wired up yet, use these Google Fonts proxies and note

the swap in code:



\- \*\*Manrope\*\* in place of Objektiv Mk1 (geometric sans, similar weights)

\- \*\*Albert Sans\*\* in place of Bilo (humanist sans, similar warmth)



Do not use Inter, Roboto, or system fonts as substitutes — the brand has a

specific feel and these flatten it.



\*\*Logo rules\*\* (full detail in the PDF):



\- Always use the full lockup (flame mark + wordmark) together.

\- Minimum width 30mm in print; on screen keep the mark at least \~32px wide.

\- Maintain the exclusion zone (width of one "u" from the wordmark).

\- Full-colour version preferred; white version on dark backgrounds; mono only

&#x20; when colour print is unavailable. Never recolour.



\## Stack \& deployment



\- \*\*Hosting:\*\* Cloudflare Pages.

\- \*\*DNS:\*\* Mythic Beasts, both `burningsuit.co.uk` and `burningsuit.com`.

\- \*\*Registrar:\*\* Mythic Beasts (both domains).

\- \*\*Email:\*\* Microsoft 365 (separate concern — do not touch MX, SPF, or

&#x20; `autodiscover` records as part of website work).

\- \*\*Git host:\*\* TBD — wherever the repo lives. Cloudflare Pages connects on

&#x20; push.



For Phase 1, the build is "no build" — a static `index.html` (plus any

assets) served as-is. For Phase 2, if a generator is introduced, the build

command and output directory will need to be configured in Cloudflare Pages.



\## Conventions



\- \*\*Single file when possible.\*\* Phase 1 is plain HTML with inline CSS; no

&#x20; dependencies, no build step, no JavaScript unless there's a specific reason.

\- \*\*Accessibility is non-negotiable.\*\* Semantic HTML, real heading hierarchy,

&#x20; alt text on images, `prefers-reduced-motion` respected on any animation,

&#x20; sufficient colour contrast (the aubergine/orange pairing comfortably passes,

&#x20; but always check new combinations).

\- \*\*Performance matters more than polish.\*\* This is a small business site

&#x20; that should load instantly on a phone on cellular. No web fonts beyond what

&#x20; the typography requires; no analytics unless asked; no third-party scripts.

\- \*\*No cookies, no tracking, no consent banners\*\* unless something concrete

&#x20; changes that.

\- \*\*Mobile-first.\*\* Use fluid type (`clamp()`) and intrinsic layout over

&#x20; breakpoint stacks where it works.

\- \*\*Edit hooks.\*\* When generating placeholder content, mark it clearly with

&#x20; `EDIT:` comments so Alan can find it and rewrite in his own voice.



\## Tone and voice



The company is in transition — moving from a training-and-courses model

toward bespoke advisory work for a smaller number of clients. Copy should

reflect that: thoughtful, plain-spoken, confident without being puffy. Avoid

consultancy clichés ("solutions", "transform", "unlock", "leverage", "next

generation"). Avoid the opposite trap of being twee or self-deprecating.



When in doubt, ask Alan for the right phrasing rather than guessing.



\## Files in this folder



\- `CLAUDE.md` — this file.

\- `Burningsuit\_Brand\_Guidelines\_V1.pdf` — brand guidelines (May 2022).

\- `logos/` — logo files (when added).

\- Site source — to be added.



\## Out of scope for this project



\- DNS changes (handled at Mythic Beasts, separate concern).

\- Email setup (handled at M365, separate concern).

\- The previous WordPress/PHP site on April's hosting — going away 1 June 2026

&#x20; and not being migrated; treat it as gone.



