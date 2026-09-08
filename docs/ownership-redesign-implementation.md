# Ownership redesign implementation — 8 September 2026

This pass implements `ownership-redesign-review.md` on `feat/ownership-redesign`. Alan authorised branch drafts and placeholders while he finishes the remaining inputs, and authorised pushing this branch. Integration into `dev` and production promotion remain separate decisions.

## Inputs still to replace before release

- `BOOKING_URL` uses the proposed `https://cal.com/alan-burningsuit/hour` as an unverified stub. Alan will create and confirm the 60-minute event, retain the old `30min` event live but unlisted, and add the two required questions: “What does your team need to be able to do that it can't yet?” and “What's been tried so far, and by whom?” The event description should match the hour page.
- The hour page, both hero signatures and the Power BI AI chapter use branch draft copy. Alan will supply final wording and confirm the positional attribution names.
- The essay is visibly dummy content. Replace its MDX with Alan's essay and add publication dates and confirmed talk venues/year. No talk venues or dates have been invented.
- The About revert awaits Alan's final sign-off.
- The Power BI share image remains the existing image, with alt text accurately describing its “done with you” wording, pending Alan's replacement.

## Implementation decisions

Home follows the detailed page order in the review: hero, evidence, situations, the pricing sentence, stance, photo and About teaser. The footer closes the page. The `/hour/` and writing route foundations are introduced early so subsequent page milestones have valid links throughout.

Booking attribution was renamed on 8 September 2026. Read historical analytics against the earlier names. Buttons link directly to the proposed booking event; explanatory links go to `/hour/`. Email remains a separate contact action.

The footer stays in document flow. In normal motion with JavaScript available, `main` uncovers a sticky footer; both top and bottom insets let a footer taller than the viewport scroll fully into view. Keyboard focus returns it to its natural position and scrolls the focused action into view immediately. No footer-height measurement or reserved-space script is used. Reduced motion, no JavaScript and print use a static footer.

`CasefilePanel` still had one real consumer, contrary to the review's initial assumption. Its testimonial markup was folded into `Casefile` before removal, retaining the existing `namedTier()` guard. `PrinciplesChapter` had no consumers and was removed. Anonymous study facts and permissions remain unchanged.

## Validation

Each milestone below passed `npm run gate` and the complete functional suite before its commit. The gate includes Astro checking, the production build, byte budgets, local links and SEO/JSON-LD assertions. Raw local evidence is kept in the ignored `.review-pass/` directory.

| Milestone | Commit | Functional checks |
| --- | --- | --- |
| Booking labels, event stub and positional attribution | `5d1a0e6` | 103 passed |
| Hour page and writing foundations | `b99ffa2` | 114 passed |
| Power BI situations, pricing ladder and AI chapter | `37b30f4` | 114 passed |
| Home router and restored stance | `fedbc76` | 114 passed |
| AI fold, redirects and route coverage | `012e3a0` | 109 passed |
| About revert and voice pass | `b17a504` | 109 passed |
| Footer reveal and accessible focus | `80900d5` | 128 passed |
| Study sentence case and component cleanup | `4141682` | 130 passed |
| Stable hash targets and print invitation grouping | `d9eaf30` | 137 passed |

The hour's full content occupies 393px below the header at the 1280×720 desktop viewport; its contact actions are visible without scrolling. Narrow screens retain natural vertical flow. The writing SEO checker was also exercised against ten isolated fixtures: two valid variants and eight deliberately invalid author, breadcrumb, redirect and date cases were handled as expected.

The final gate checks 12 pages and 49 redirect stubs. The functional suite covers all eight Power BI anchors in both normal and reduced motion at six viewport sizes; the five Home situations lead through Power BI to the hour. The four Work tile plates each occupy one line at 390px. Mobile Lighthouse now enforces zero median CLS, and the final review also checks each individual run.

The visual baseline update ran once after the authorised draft copy settled, producing 132 fresh candidate images. All 132 were individually reviewed across Chromium, Firefox and both mobile projects before adoption. The confirmation run on the final build passed 61 visual tests with three intentional skips of the desktop-only geometry assertion. The subsequent fixes affect hash-target animation and print pagination; ordinary reduced-motion region captures are unchanged.

Final code revision: `d9eaf30`. A five-viewport normal-motion sweep checked 60 route/view combinations and 960 header/footer focus states on `4141682`; the affected targets and print output were repeated after the final CSS fixes. All 80 anchor checks passed. Genuine Chrome page zoom at 200% passed on all 12 routes, including 192 natural keyboard states, all 16 anchor checks and immediate header focus return. The isolated browser setting was restored and the audit browsers closed. All 17 A4 pages were reviewed: Home 5, Power BI 8, hour 2 and the dummy essay 2. The Power BI invitation, booking button and email link now stay together on page 7. The final essay will need a fresh reading and print review when supplied.

Desktop Lighthouse passes all seven routes at 1.00 for performance, accessibility and best practices, with zero CLS. It retains the established desktop configuration that excludes the analytics tracker. Mobile audits include analytics with no blocked URL patterns: Home scores 0.99/0.99/0.99 and Power BI 0.98/0.98/0.98, with zero CLS in every run. The Umami script and beacons return HTTP 200, and there are no console errors. Both mobile median assertions pass without an exception.

Lighthouse SEO remains 0.92 because its static-server run reports that it could not download `robots.txt`; the built file exists and returns HTTP 200 from the verified local server. The separate SEO/identity gate passes for every page and redirect. The built Home SHA-256 remains `c41e81664f95f53e4ca9bc7ce6233cb9bc5882aaf244f0ee13b4d033f8ff2f42` after all checks.

Local evidence: `.review-pass/final-gate.log`, `final-functional.log`, `visual-update.log`, `visual-confirm.log`, both visual-review Markdown files, `footer-final/review.md`, and the full `lighthouse-desktop/` and `lighthouse-mobile/` reports. The author-supplied inputs at the top of this document remain intentionally deferred; no live Cal.com booking handoff is claimed for the stub URL.
