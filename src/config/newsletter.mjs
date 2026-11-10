// @ts-check
/**
 * The newsletter sign-up: a plain POST to the Kit form, with no Kit script. Kit answers with a redirect to its own
 * confirmation page and emails a link to confirm. The form number is a public submission address, not a credential.
 */
export const NEWSLETTER = Object.freeze({
  action: "https://app.kit.com/forms/10117647/subscriptions",
  /** The field name Kit's form expects. */
  field: "email_address",
  privacyPath: "/privacy/#newsletter",
});
