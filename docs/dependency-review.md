# Dependency review — 8 September 2026

This change raises Astro's declared floor to 6.4.8 and updates dependencies within their existing supported ranges. It uses Node 22.23.2 and npm 11.15.0. No forced audit fixes, unsupported overrides or tooling downgrades were applied. Weekly npm and GitHub Actions Dependabot updates target `dev` for review.

Direct updates include Astro 6.4.8, @astrojs/check 0.9.10, @astrojs/sitemap 3.7.4, Playwright 1.63.0, Tailwind and its PostCSS integration 4.3.3, @types/node 26.5.0 and Sharp 0.35.4. TypeScript remains at 5.9.3, now reflected in its declared floor. MDX 6.0.3, LHCI 0.15.1 and linkinator 7.6.1 remain on their existing major versions. The lockfile also updates compatible parser, stylesheet, image, language-server and utility dependency chains.

The full `npm audit --json` result changes from 29 findings (17 high, 9 moderate, 3 low) to 16 findings (9 high, 4 moderate, 3 low). These totals include parent packages affected through dependencies; they are not counts of independent vulnerabilities in the deployed website. The remaining findings require an applicability review, not a claim that every advisory has been resolved.

## Astro and image processing

Astro 6.4.8 fixes the specified [6.4.7 authorization bypass](https://github.com/withastro/astro/security/advisories/GHSA-vj59-8hwv-xxmv). Exploitation requires pathname-based authorization followed by rewrite routing. This repository produces static files and has no request-time middleware, protected server routes or Astro server deployment, so that affected request path is absent.

The following findings remain in the installed tree:

| Finding | Affected feature and current exposure |
|---|---|
| [Astro custom-element attribute injection](https://github.com/advisories/GHSA-f48w-9m4c-m7f5), fixed in 7.0.6 | Requires untrusted spread-property names on an HTMLElement-subclass component, with a server runtime exposing HTMLElement. There are no such components, DOM shims or request-derived props here. |
| [Astro hydrated-island transition directives](https://github.com/advisories/GHSA-7pw4-f3q4-r2p2), fixed in 7.0.4 | Requires attacker-controlled directive values on a client-hydrated component. The site has no framework islands or Astro transition directives. |
| [Astro View Transition animation injection](https://github.com/advisories/GHSA-4g3v-8h47-v7g6), fixed in 7.1.0 | Requires attacker-controlled animation properties entering Astro's generated markup. The site does not use that API or take animation values from requests. Its CSS entrance and scroll effects do not use this feature. |
| [Sharp/libvips image decoding](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) | Astro 6.4.8 still declares optional Sharp `^0.34.0`, leaving nested Sharp 0.34.5. Updating the site's direct Sharp dependency to 0.35.4 does not remove that nested version. Current Astro inputs are repository JPEGs; there is no upload flow, dynamic image endpoint or remote image allowlist. Importing untrusted image files would introduce build-time exposure. |
| [esbuild Windows development server traversal](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr), fixed in 0.28.1 | Astro's supported range retains esbuild 0.27.7. The affected feature is esbuild's own `servedir` server on Windows. The repository does not invoke it: Astro uses Vite for development, and built-site tests use http-server. |

Astro 7 is separate future work, including its integration compatibility and the Sharp chain. Do not override Astro's declared Sharp or esbuild ranges merely to remove audit entries. Reassess these findings if request-time rendering, custom-element components, framework islands, Astro transitions or untrusted content inputs are introduced.

## Development and audit tooling

LHCI 0.15.1 pins Lighthouse 12.6.1. Neither LHCI nor the test servers are deployed in `dist/`, but their local input surfaces still matter.

| Finding | Affected feature and current exposure |
|---|---|
| [extract-zip symlink traversal](https://github.com/advisories/GHSA-jmr9-qjv8-65gv), inherited through Lighthouse/Puppeteer/browser tooling | Processing a malicious ZIP can create symlinks outside the extraction directory. Audits use an installed browser and known local build URLs, not user-supplied archives. Browser-download integrity remains a tooling exposure; no compatible fix is available through the current LHCI chain. |
| [tmp symlink handling](https://github.com/advisories/GHSA-52f5-9888-hmc6) and [prefix/postfix traversal](https://github.com/advisories/GHSA-ph9p-34f9-6g65) | LHCI retains tmp 0.1.0; its interactive editor chain retains tmp 0.0.33. The inspected open command supplies a fixed `.html` postfix, and autorun does not invoke the interactive wizard/editor. The vulnerable dependencies remain installed. |
| [UUID supplied-buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | The advisory concerns v3/v5/v6 with a supplied buffer. The inspected LHCI collection path uses uuid.v4 for temporary flags filenames. |
| [qs comma/bracket parsing](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) and [attacker-controlled isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | LHCI's Express 4.22.2 constrains qs to `~6.15.1`, retaining 6.15.3; http-server's union dependency also resolves that version. Updated body-parser separately uses fixed qs 6.16.0. Tests and audits request known URLs, but these transient servers can accept query data and are not explicitly bound to loopback by their current configuration. An externally reachable lab listener remains a development input surface. |

The audit's proposed LHCI 0.1.0 downgrade is not an acceptable maintenance fix. Keep the current tool, monitor upstream releases and reassess residual findings when compatible updates become available. This review records current reachability and input exposure; it does not suppress advisories or replace future review.
