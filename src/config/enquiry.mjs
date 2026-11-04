// @ts-check
/**
 * Shared by the homepage form, Astro's CSP form-action and the release check.
 *
 * No form provider is approved yet. While `action` is null the form renders for
 * review without a destination, CSP keeps form-action 'none' (so nothing is sent
 * anywhere), and `npm run check:release` fails. Once a provider is chosen and its
 * delivery, error handling and privacy wording are verified, set its plain-POST
 * endpoint here; the CSP then allows that origin and nothing else.
 */
export const ENQUIRY = Object.freeze({
  /** @type {string | null} */
  action: null,
  email: "alan@burningsuit.co.uk",
  topics: Object.freeze([
    "Power BI fundamentals",
    "Power BI with AI agents 101",
    "Another course",
    "Consultancy",
    "Not sure yet",
  ]),
});

/** The CSP form-action source list for the configured endpoint. */
export const formActionSource = ENQUIRY.action ? new URL(ENQUIRY.action).origin : "'none'";
