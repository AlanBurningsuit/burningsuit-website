# Ownership redesign implementation — 8 September 2026

This pass implements `ownership-redesign-review.md` on `feat/ownership-redesign`. Alan authorised branch drafts and placeholders while he finishes the remaining inputs, and authorised pushing this branch. Integration into `dev` and production promotion remain separate decisions.

## Inputs still to replace before release

- Alan confirmed `BOOKING_URL` as `https://cal.com/alan-burningsuit/hour` on 9 September 2026. The event configuration still needs checking against the release requirements: retain the old `30min` event live but unlisted and include the two required questions, “What does your team need to be able to do that it can't yet?” and “What's been tried so far, and by whom?” The event description should match the hour page.
- The hour page, both hero signatures and the Power BI AI chapter use branch draft copy. Alan will supply final wording and confirm the positional attribution names.
- Alan supplied the essay text and reference slide deck on 9 September 2026. The dummy MDX and four figure placeholders have been replaced. Publication dates and confirmed talk venues/year remain unset; none have been invented.
- The About revert awaits Alan's final sign-off.
- The Power BI share image remains the existing image, with alt text accurately describing its “done with you” wording, pending Alan's replacement.

## Implementation decisions

Home follows the detailed page order in the review: hero, evidence, situations, the pricing sentence, stance, photo and About teaser. The footer closes the page. The `/hour/` and writing route foundations are introduced early so subsequent page milestones have valid links throughout.

Booking attribution was renamed on 8 September 2026. Read historical analytics against the earlier names. On 9 September, Alan confirmed the booking URL and requested a `placement` query parameter alongside `utm_content`; both carry the same encoded button location. Buttons link directly to the confirmed booking event; explanatory links go to `/hour/`. Email remains a separate contact action.

The footer stays in document flow. In normal motion with JavaScript available, `main` uncovers a sticky footer; both top and bottom insets let a footer taller than the viewport scroll fully into view. Keyboard focus returns it to its natural position and scrolls the focused action into view immediately. No footer-height measurement or reserved-space script is used. Reduced motion, no JavaScript and print use a static footer.

`CasefilePanel` still had one real consumer, contrary to the review's initial assumption. Its testimonial markup was folded into `Casefile` before removal, retaining the existing `namedTier()` guard. `PrinciplesChapter` had no consumers and was removed. Anonymous study facts and permissions remain unchanged.

## Validation — 8 September 2026

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

Local evidence: `.review-pass/final-gate.log`, `final-functional.log`, `visual-update.log`, `visual-confirm.log`, both visual-review Markdown files, `footer-final/review.md`, and the full `lighthouse-desktop/` and `lighthouse-mobile/` reports. The remaining author-supplied inputs are listed at the top of this document. These checks do not verify Cal.com event settings or complete a live booking.

## Booking parameter update — 9 September 2026

`bookingHref()` now sends the same URL-encoded button location in `utm_content` and `placement`. The gate passes, and all seven booking-link and click-attribution checks pass. The full functional run reported 119 passed and 18 navigation failures involving scrolling and focus. An isolated build of the unchanged branch at `171191f` reproduced the same 18 failing tests, so these were not introduced by the booking parameter update. The navigation follow-up below resolves them.

Local evidence: `.review-pass/booking-placement-gate.log`, `booking-placement-functional.log`, `booking-baseline-build.log` and `booking-baseline-functional.log`.

## Navigation follow-up — 9 September 2026

The root smooth-scroll rule animated keyboard focus movement, briefly leaving focused links outside the viewport. Scrolling is now immediate while keyboard focus is visible; pointer navigation retains smooth scrolling. A focused card also exposes its descendant reveal content immediately, including the About teaser's text and portrait. Firefox could leave the next Work card only partly visible, so linked panels now scroll into view on keyboard focus with token-based space for their outline.

The six anchor failures also exposed test timing: same-document hash navigation could still be scrolling when geometry was checked. Anchor tests now wait for visible, stable scroll and header positions before checking full visibility and header clearance in one geometry read. All keyboard-focus checks remain immediate, and now check descendant readability and full Work-card containment. Font readiness is polled as synchronous browser state so Firefox tests with JavaScript disabled do not stall on a page promise.

Final validation passes: `npm run gate`, all 137 Chromium functional tests, and all 62 navigation checks across Firefox and the 390px mobile project. The focused About teaser and Firefox Work cards were also inspected visually. No navigation failures remain from these runs.

## Essay integration — 9 September 2026

Alan's supplied essay replaces the dummy content at the existing writing URL. The seven source headings and all prose are preserved, with the source subtitle used for the hero lead and metadata description. The introductory paragraph uses the existing reading layout; the remaining sections use `Chapter`. Four authored figure markers remain visible until artwork is supplied. No publication dates or talk appearances have been added.

Validation: `npm run gate` and all 137 Chromium functional tests pass. The rendered essay matches all 34 source text blocks at 1280px and 390px after accounting for the site's automatic smart punctuation. Neither viewport overflows horizontally, and the print stylesheet leaves the essay text visible. Eight updated hero/body screenshots were visually reviewed across Chromium, Firefox and both mobile sizes; all four essay visual tests pass against the adopted baselines. Full paginated print review remains part of final release review once the figures are supplied.

Local evidence: `.review-pass/essay-gate.log`, `essay-functional.log`, `essay-check.json` and `essay-visual-confirm.log`.

## Essay figures — 9 September 2026

The four placeholders now use static HTML and SVG diagrams adapted from Alan's supplied talk deck: the context/tool interaction on slides 12–13, the visual validation loop on slide 23, and the delegation slopes on slides 27–28. Animated builds and overlapping slide labels are not reproduced. The domain-experience figure compares the two slopes on shared axes; the charts are explicitly conceptual, with no invented measurements.

The loops use text at reading size, and the charts scale within the prose column. Figure captions and SVG descriptions provide text equivalents; the experience comparison uses dashed and solid lines as well as colour. The original deck and manuscript are unchanged. All 30 non-placeholder source text blocks still match the rendered essay at desktop and phone widths.

Validation passes: the full gate, 137 Chromium functional checks and four essay visual tests. All 16 new figure snapshots were inspected across Chromium, Firefox and both mobile sizes before adoption. Desktop and 390px checks show four figures, no horizontal overflow and visible print text. Full paginated print review remains a release check. Local evidence is under `.review-pass/essay-figures/`.

Local evidence: `.review-pass/nav-fix-gate.log`, `nav-fix-functional.log`, `nav-fix-cross-browser.log`, `nav-fix-smoke.json`, `nav-firefox-evidence.json` and their focused-state screenshots.
