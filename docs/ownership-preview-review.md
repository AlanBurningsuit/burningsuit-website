# Clarifying the offer within the current design

Alan rejected both comparison treatments on 8 September 2026. Their copy and flow were broadly accepted. The existing field-notebook design is retained: typography, colours, photographs, frames, tabs and margin notes. There is no A/B selection pending.

Work continues on `feat/ownership-redesign`, preserving the existing maintenance and preview commits. Local implementation and checked milestone commits are authorised. Every remote push still needs permission; preview publication and production promotion are separate decisions. A merge to `main` deploys the live apex.

The accepted content moves into the existing production components. The five situations describe an adaptable relationship; Discovery, the substantial-team monthly guide, lighter support, upfront credit and jointly agreed tapering are explicit. The two Home study panels carry the evidence. Power BI becomes the forwardable buying explanation, with AI, About and case-study summaries aligned to it.

The first milestone restores entrance and scroll effects while retaining the necessary fixes: a footer in normal flow, contrasting cream focus outlines, header clearance for anchors, immediately readable no-JavaScript/reduced-motion/print states, and contact controls without reveal gates. The header hides on downward scrolling, returns upward or on keyboard focus, and stays visible under reduced motion. Cross-document view transitions remain removed. Readability tests inspect each hiding mechanism directly without forcing reveals.

The comparison implementation will be removed after its copy is transferred. Validation covers the built artifact, functional checks, desktop and mobile Lighthouse, Windows visual baselines, browser zoom and a fresh-reader comprehension review. Local reports and captures are retained in `.release-review/`; the final release record will distinguish intentional changes, remaining advisories and any unresolved checks. Successful local validation is not evidence of conversion or a production release.

Milestone 1 validation: `npm run gate` passed on Node 22.23.2; `npm run test:functional` passed all 62 Chromium tests, including the immediate three-mode readability matrix, no-IntersectionObserver fallback, print, natural keyboard access and normal/reduced-motion header behaviour.
