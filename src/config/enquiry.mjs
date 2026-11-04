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

/**
 * The CSP form-action source for an endpoint: 'none' without one, 'self' for a
 * root-relative or same-site path, otherwise the endpoint's HTTPS origin.
 * @param {string | null} action
 */
export function formActionFor(action) {
  if (!action) return "'none'";
  if (/^\/(?!\/)/.test(action)) return "'self'";
  const url = new URL(action);
  if (url.protocol !== "https:") throw new Error("Enquiry form action must be HTTPS or a root-relative path.");
  return url.origin;
}
export const formActionSource = formActionFor(ENQUIRY.action);
