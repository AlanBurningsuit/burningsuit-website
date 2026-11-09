// IndexNow (indexnow.org): after each production deploy, scripts/indexnow.mjs tells Bing and the other IndexNow engines
// which URLs to recrawl. The key is public by design: search engines verify it by fetching /<key>.txt from the site.
export const INDEXNOW_KEY = "b26c83d44558666d1214020f2a82a1be";
