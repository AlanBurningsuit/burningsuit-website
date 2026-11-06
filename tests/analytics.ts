import { ANALYTICS } from "../src/config/analytics.mjs";

// The site-wide Umami tag is the only permitted third-party script and request; it reports only from the production domains, never from test hosts.
export const tracker = `script[src="${ANALYTICS.scriptSrc}"]`;
export const otherScripts = `script:not([src="${ANALYTICS.scriptSrc}"])`;
export const isTracker = (url: string) => url === ANALYTICS.scriptSrc;
