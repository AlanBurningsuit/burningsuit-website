# Ownership redesign: review and next actions — 8 September 2026

Review of `feat/ownership-redesign` against `main`, focused on reader flow and copy. Alan reviewed the findings and made the decisions recorded below. This document is the brief for the next pass on the branch. It supersedes the action items in `ownership-preview-review.md`; the validation record there still stands.

## Verdict

The direction is right and should continue. The old site asked the reader to decode a stance. The new pages answer a buyer's questions in the order they ask them: what does this look like, which of these is me, how does it run, what does it cost. Pricing on the page is the single biggest change and the correct one for a solo advisory. The five situations are written in the customer's voice and repeat across Home and Power BI, so the reader recognises where they are. The evidence now describes what the person can do, not what was built, so the proof and the promise finally agree.

Two things went wrong on the way. The voice went with the old structure: the site now reads like a competent training company rather than the one person in the market with a point of view about AI and responsibility. And the situations are dead ends. A lead who says "yes, that's us" has nowhere to go except a page that repeats the list.

The pass below keeps the structure and puts the personality and the exits back.

## Decisions

Made by Alan on 8 September 2026.

1. **Home becomes a router.** Hero, the five situations as links, two evidence panels, the stance, the about teaser. The movements and the pricing table leave Home.
2. **The easy way in is a free hour.** Headline: *Tell me what your reporting can't do (yet).* It replaces the 30-minute call everywhere. It is free, with two required questions on the booking form. Too many bookings is the problem we want.
3. **AI Fit for Teams folds into the Power BI page.** The offer is unproven and Alan has not worked out what the AI offer is. The site stops guessing. The stance lives in an essay; what Alan does with Copilot today lives in a Power BI chapter; the hour is where he hears what people are actually asking about AI. The page returns when there is a real offer.
4. **The talk becomes an essay page** in a new `writing` content collection. One essay, no index page until there is a second.
5. **The footer basement gets a spike.** Try a sticky version that keeps the full-size lockup reveal while staying in document flow. Keep it only if every accessibility gate passes.
6. **Sentence case is finished inside the case studies**, with one visual-baseline refresh at the end of the pass.
7. **About reverts** its hero paragraph and "the part that isn't really technical" chapter to the `main` text, keeping sentence case and the specific talk facts once confirmed.

## The hour

### What it is

A free hour on a call. The lead describes where the reporting is stuck or what the team keeps not managing to do. Alan helps them work out whether the problem is the scope, the skills, or something else, and what the next step is. Sometimes the next step is not him.

The framing matters because of who it must attract. The subject is the reporting, not the team, so a lead does not hear "training" and does not feel their people are being blamed. It is not "show me the report", because a lead rarely has a report to show and a developer always does. The scope/skills/something-else question is the lead's actual decision, and a developer's problem is almost never one of those three, so the framing filters without a rule.

Draft copy, for Alan to finish in his own words:

> **Tell me what your reporting can't do (yet).**
>
> An hour, free, on a call. You describe where the reporting is stuck, or what the team keeps not managing to do. I'll help you work out whether the problem is the scope, the skills, or something else, and what the next step is. You don't need to know what's wrong, and you don't need to show me anything.

### The landing page

Yes, build one, at `/hour/`. It is the URL Alan can say out loud and put on a slide. It gives the two booking questions a place to be explained before the lead meets them. And it is where every "not sure which of these is us" link on the site lands.

Keep it to one screen of content:

- Page hero: the headline as H1 (one amber `em`, on "yet"), the paragraph above as the lead.
- What happens: a short list. Before: the two questions on the booking form, so you have thought about it for five minutes. During: an hour, you talk, Alan asks, you work out which kind of problem it is. After: you leave with the next step, whether or not it involves burningsuit.
- The `BookCta` hero variant: primary "Book an hour" to Cal.com with `utm_content=hour-page`, secondary "Or email me".
- Nothing else. No case studies, no pricing. The page has one job.

One rule for the rest of the site: **buttons book, text links explain.** A `.cta` button always goes straight to Cal.com. A text link reading "Tell me what your reporting can't do (yet) ▸" goes to `/hour/`.

### Cal.com

Outside the repo, for Alan:

- New 60-minute event type. Suggested slug `hour`. Keep the old `30min` event live but unlisted, because links to it exist in the wild.
- Two required booking questions: *What does your team need to be able to do that it can't yet?* and *What's been tried so far, and by whom?*
- The event description carries the same headline and paragraph as the landing page, so the tone does not change at the moment of booking.

In the repo:

- `src/config/site.ts`: `BOOKING_URL` moves to the new event. Update the comment block that describes the 30-minute event.
- `src/components/BookCta.astro`: default label becomes "Book an hour".
- `src/components/Footer.astro`: the button label and the header comment.
- `src/components/Header.astro`: "Book a call" becomes "Book an hour".
- Every CTA-band note that says "30-minute call" or "30 minutes". Grep for `30-minute` and `30 minutes` in `src/`.
- `src/pages/privacy.astro`, the "Booking a call" chapter: still accurate about Cal.com, but check any mention of the call's length.

### Placement attribution

Rename the `utm_content` placements so they describe position, and date the rename in the `site.ts` comment. Suggested set: `header`, `footer`, `home-hero`, `home-situations`, `power-bi-hero`, `power-bi-pricing`, `hour-page`, `work`, and the per-study value the case-study layout already uses. `home-proof` and the duplicated `hero` value go. Analytics before the rename date are read against the old names.

## The writing collection

- `src/content.config.ts`: add a `writing` collection alongside `work`, glob-loaded from `src/content/writing/`. Schema: `title`, `description`, `heading` (`before`/`em`/`after`, one `em`), `lead`, `kicker` (default "Essay"), `datePublished`, `dateModified`, `contactSubject`, `footerInvitation`, and an optional `givenAt` array of `{ event, date }` for talks. Export it from `collections`.
- `src/layouts/EssayLayout.astro`: start from `CaseStudyLayout.astro`. Text-led page hero, chaptered body through the default slot, `Article` JSON-LD with the Person `@id` as author, breadcrumb Home → title. Do not put a "Writing" crumb in until an index page exists. No `Casefile` block; the closing door is one sentence and a link to `/hour/`.
- `src/pages/writing/[slug].astro`: mirror `src/pages/work/[slug].astro`.
- `src/content/writing/we-are-all-middle-management-now.mdx`: Alan supplies the essay. Use `Chapter` for structure. `givenAt` carries the venues once confirmed.
- **No `/writing/` index page.** Add a redirect entry `"/writing": "/writing/we-are-all-middle-management-now/"` in `astro.config.mjs` so a typed URL lands somewhere, and remove it when a second essay earns the index.
- The legacy `/blog/*` redirects keep pointing at `/power-bi/`. They were technique posts and this essay is not their successor.
- Link the essay from: the About talk paragraph, the Power BI AI chapter, and the Home stance chapter.

## Folding AI Fit into Power BI

- Delete `src/pages/ai-fit-for-teams.astro`.
- Add a redirect `"/ai-fit-for-teams": "/power-bi/"` to `astro.config.mjs`. The stub check in `scripts/check-seo.mjs` verifies the target is a built page; if it tolerates a fragment, prefer `/power-bi/#ai`.
- Power BI: the "Already have Copilot?" chapter becomes the AI chapter, id `ai` (replacing `practical-ai`). Heading and copy are Alan's. The content: what he actually does with Copilot and AI in Power BI work today; the check on which Copilot product the team can use; one sentence of the stance with a link to the essay; and a line saying that being asked what to do about AI in the team is a fine thing to bring to the hour, with the link. No fit map, no two-to-three-week project.
- Remove: the `aiRows` doors on Home; the "AI" nav item in `Header.astro` (nav becomes Power BI, Case studies, About, plus the button); the AI Fit link on `404.astro`; `public/social/linkedin-ai-fit.png` and its entry in `scripts/render-linkedin-featured.mjs`; the `.aifit-hero`, `.fitmap-doc`, `.fitmap`, `.fm-label` and `.hero-ask` rules in `app.css` if nothing else uses them; the `/ai-fit-for-teams/` URL from `lighthouserc.cjs`, `tests/states.spec.ts`, `tests/responsive.spec.ts`, `tests/csp.spec.ts`, and the region test in `tests/visual.spec.ts`; the comment in `astro.config.mjs` that lists it among auto-discovered pages.
- Keep the AI entries in `FOUNDER.knowsAbout` and `SERVICE_AREAS`. They are true.

## Actions by page

### Home

Order, top to bottom:

1. **Hero.** H1 stays *Power BI your team can own.* Lede stays. The signature line loses "I teach". Revert to the tenure shape of the `main` sig: who Alan is, how long alongside teams, what came before. The CTA row: "Book an hour" and "Or email me", placement `home-hero`.
2. **In practice.** The two evidence panels stay. Under them, one line: "All four case studies ▸" to `/work/`.
3. **Where is your team now?** The five situations stay, but each title is a link to its anchor on Power BI (see the ids below). The paragraph about arranging training stays. The closing link becomes "Not sure which? Tell me what your reporting can't do (yet) ▸" to `/hour/`, placement `home-situations` on any button.
4. **Pricing, one line.** "Discovery is £1,950. Ongoing work with a team is usually £3,000 to £6,000 a month, and lighter arrangements are quoted separately. How the arrangements work ▸" to `/power-bi/#pricing`. The three-row table and the "how the work fits together" movements are removed.
5. **The stance.** Bring back `StatementChapter` with the `main` line in sentence case: *AI will build whatever you ask. Someone still has to know what to ask for.* Add an optional link line to the component ("Read the essay ▸" to the essay). This replaces the AI doors and is the personality returning.
6. `PhotoChapter`, then `AboutTeaser`.
7. **No CTA band at the end.** The footer is the close. If a band is wanted it sits after the situations, not after the teaser.

Home no longer needs `Offer` or the `movements` markup. Check `Chapter` is still used before removing the import.

### Power BI

- **Hero.** Signature line loses "I teach"; same tenure shape as Home. Title tag and H1 must agree: either the H1 becomes *Power BI your team can own.* or the title follows *Reporting your team can own.* Recommend the former, since Home's H1 can then differ in the router rewrite if wanted.
- **Situations.** Give each `Offer` an id so Home can link to it: `skills`, `deliver`, `handover`, `second-opinion`, `backup`. `Offer` needs an optional `id` prop. Each situation ends with two lines: the usual shape, and the constant link. Draft shapes, for Alan to finish:
  - 01 Skills: "Usually Discovery, then a workshop series with practice between sessions."
  - 02 Deliver: "Usually a monthly arrangement for the length of the project."
  - 03 Handover: "Usually Discovery to map what was built, then a monthly arrangement alongside the handover."
  - 04 Second opinion: "A regular slot of your own, quoted separately."
  - 05 Backup: "Office hours and email support, quoted on their own."
  - Constant link under each: "Tell me what your reporting can't do (yet) ▸" to `/hour/`.
- **How the learning becomes part of the job.** Stays. Add "All four case studies ▸" under the two study links.
- **Discovery.** Stays. Replace nothing.
- **Pricing.** Add a first row above Discovery: title "An hour, free", meta "The place to start", body one sentence on the scope/skills/something-else question with the link. The ladder then reads hour → Discovery → ongoing → lighter → rolling or up front → tapering.
- **CTA band.** Stays after pricing. Note loses "30-minute"; placement `power-bi-pricing`.
- **AI chapter.** As described under the fold.
- **Repetition.** "Useful … start" appears in the footer invitation, the CTA note and the situations intro. Keep it in one.
- **Share image.** `public/social/linkedin-power-bi.png` still reads "done with you." Redo without that line. Until then the alt text stays accurate to the image. This is a design task, not code.
- `tests/navigation.spec.ts` checks the anchors `discovery`, `pricing` and `practical-ai` clear the header. Update to `discovery`, `pricing`, `ai` and add the five situation ids.

### The hour landing page

As specified above. Add `/hour/` to `lighthouserc.cjs`, `tests/states.spec.ts`, `tests/responsive.spec.ts`, `tests/csp.spec.ts`, and a region test in `tests/visual.spec.ts`. `check-seo.mjs` discovers pages from `dist/` and needs no list change. Add the page to the `404.astro` link list.

### Case studies and Work

- **Finish sentence case.** The `<li><strong>who:</strong>` style labels inside every `Snapshot`; every `Exhibit` `tab` and `caption` in the four MDX files; the `Snapshot` default kicker; the `kicker` default in `content.config.ts` ("case file" → "Case study"); the `ServiceRow` and `DoorRow` default `cta` ("see how it works" → "See how it works").
- **Delete unused components.** `CasefilePanel.astro` and `PrinciplesChapter.astro` have no page users after this pass. Check `src/lib/named.ts` only mentions `CasefilePanel` in a comment before removing.
- **Law firm.** Home evidence title reads oddly ("a build they hadn't done"). Match the study heading ("a build they didn't do") or reword.
- **Museum.** `tileOutcome` drops "checks the date logic" for "checks the numbers".
- **Case-study door.** `CaseStudyLayout.astro`'s closing paragraph is a bare link. Add one lead-in sentence, and point the link at `/hour/` rather than the Power BI page, since a reader who has just finished a story is a lead, not a buyer comparing prices.
- **Tab plates.** The new kickers are long for the `/work/` tiles on mobile. Review the 390px baselines after the copy settles and shorten if they wrap to three lines.

### About

- Take the hero `lead` paragraph and both paragraphs of "The part that isn't really technical" from `origin/main:src/pages/about.astro`. Apply sentence case only.
- Keep the added paragraph in "I start from what people can do" about the decade in software, but break its shape (see the voice note below).
- The talk sentence keeps the specific venues only after Alan confirms them, and links "we're all middle management now" to the essay.
- Keep "They handed it over and they're properly retired now" (the removal of "last year" was right).
- The `AboutTeaser` `.go` label and paragraph are fine.

### Footer basement spike

Goal: the old full-size lockup reveal, with none of the problems that removed it (footer links hidden behind `main` on keyboard focus, footer height measured in JavaScript, print and no-JavaScript states).

Approach to try: footer stays after `main` in document flow with `position: sticky; bottom: 0; z-index: 0`, and `main` gets `position: relative; z-index: 1` with an opaque background, so `main` slides up over the footer as the reader reaches the end. No `--footer-h` measurement is needed because the footer is in flow.

Be honest about one thing: sticky alone does not fix hidden focus. While pinned, the footer's links are geometrically inside the viewport behind `main`, so focusing one does not scroll. Expect to need a `focusin` listener on the footer that scrolls the document to the end, in `enhance.ts`. That is acceptable because the no-JavaScript state is fully readable without it.

Gates, all of which must pass or the footer stays in normal flow:

- `tests/navigation.spec.ts`: every footer action reachable and unobscured by natural Tab and Shift+Tab at all five viewports.
- Print: `position: static` for the footer under `@media print`; the A4 review from `ownership-preview-review.md` still holds.
- No JavaScript and reduced motion: footer fully readable, nothing waits for a script.
- Mobile Lighthouse CLS stays at zero.

### Voice, everywhere

The staleness has one main cause: nearly every claim on the branch is a triplet. Build, understand and check. Run, maintain and extend. Training, project support and experienced backup. Sessions, preparation, materials and support. Break them. Pick the one thing that matters in each sentence and say that. The scope/skills/something-else line is the one deliberate exception, because it is a device, not a cadence.

Smaller copy items from the first review:

- Home Discovery line "a valid finish" is replaced by the Power BI version: "If that gives you enough to carry the work forward internally, we can stop there." (Only relevant if any Discovery copy survives on the router Home.)
- AI page line "around the normal working week" disappears with the fold.
- `Chapter` and `Offer` component doc comments still show lowercase examples; update when touching them.

## Config, tests and checks

- `astro.config.mjs`: two new redirects (`/ai-fit-for-teams`, `/writing`); update the auto-discovery comment.
- `lighthouserc.cjs`: swap `/ai-fit-for-teams/` for `/hour/` and add the essay URL.
- `tests/states.spec.ts`, `tests/responsive.spec.ts`, `tests/csp.spec.ts`: route lists updated.
- `tests/visual.spec.ts`: remove the AI Fit regions, add `/hour/` and the essay.
- `tests/navigation.spec.ts`: anchor list as above.
- `tests/analytics.spec.ts`: check any placement names it asserts.
- `Header.astro` comment and `AGENTS.md` describe the nav and the pages that ship; update both.
- `README.md` and `AGENTS.md` mention the AI page nowhere directly, but check the "Commands" and page lists.
- Run `npm run gate` and `npm run test:functional` after each milestone. Run `npm run test:visual:update` once, at the end, after all copy is signed, then `npm run test:visual` to confirm. Run desktop and mobile Lighthouse against the final build.

## Order of work

1. Cal.com event and questions (Alan). `BOOKING_URL`, labels and placements (developer). Nothing else depends on the exact copy of the hour, only on its existence.
2. Power BI: situation ids and closing lines, pricing ladder row, AI chapter scaffold with the current Copilot text and marked paragraphs for Alan, title/H1 alignment.
3. The `/hour/` landing page.
4. Home router, on top of the Power BI anchors.
5. Writing collection, layout and route; essay MDX when Alan supplies it. Redirects for `/ai-fit-for-teams` and `/writing`. Delete the AI Fit page and its assets, tests and CSS.
6. About revert and the voice pass across every page.
7. Footer basement spike, gated as above.
8. Sentence case inside the studies, unused component removal, then the single visual-baseline refresh and the Lighthouse runs.

Commit each milestone. Pushes to the branch follow the existing permission rule; integration into `dev` and the production release remain separate approvals.

## What Alan supplies

- The Cal.com event, its slug and the two questions.
- Final copy for the hour page and the constant link line.
- Both hero signature lines.
- The AI chapter copy on Power BI.
- The essay as MDX, and confirmation of the venues and year for the talk.
- Sign-off on the About revert.
- The redone Power BI share image.
- Agreement on the placement attribution names before the rename.
