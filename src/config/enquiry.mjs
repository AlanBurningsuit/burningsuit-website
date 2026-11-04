// @ts-check
/**
 * Shared by the homepage form, Astro's CSP form-action and the release check.
 *
 * Formspark accepts a plain POST and redirects to static pages on this site.
 * This form ID is a public submission address, not a credential.
 * Null disables submission; release and indexing safeguards are independent.
 */
export const ENQUIRY = Object.freeze({
  /** @type {string | null} */
  action: "https://submit-form.com/OGpJJhvbY",
  successPath: "/enquiry-received/",
  errorPath: "/enquiry-error/",
  privacyPath: "/privacy/enquiries/",
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
 * root-relative path, otherwise the endpoint's HTTPS origin plus 'self' so the
 * browser can follow its confirmation/error redirect back to this site.
 * @param {string | null} action
 */
export function formActionFor(action) {
  if (!action) return "'none'";
  if (/^\/(?!\/)/.test(action)) return "'self'";
  const url = new URL(action);
  if (url.protocol !== "https:") throw new Error("Enquiry form action must be HTTPS or a root-relative path.");
  return `${url.origin} 'self'`;
}
export const formActionSource = formActionFor(ENQUIRY.action);
