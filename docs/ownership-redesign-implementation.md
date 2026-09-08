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

## Validation

Milestone and final validation results will be recorded here after completion. Raw local evidence is kept in the ignored `.review-pass/` directory.
