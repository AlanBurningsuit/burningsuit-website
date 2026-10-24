# Repository documentation

Current operating guidance lives in [the project README](../README.md) and [AGENTS.md](../AGENTS.md). The README covers setup and the source layout; AGENTS.md covers editing conventions, validation and release requirements. The private `burningsuit-ops` repository owns the website writing brief and business evidence.

## Current sources

| Concern | Source |
|---|---|
| Commands and dependency ranges | [package.json](../package.json) |
| Locked dependency versions | [package-lock.json](../package-lock.json) |
| Production deployment | [deploy.yml](../.github/workflows/deploy.yml) |
| Integration and PR validation | [validate.yml](../.github/workflows/validate.yml) |
| Preview hosting | [netlify.toml](../netlify.toml) |
| Routes, redirects, fonts and CSP | [astro.config.mjs](../astro.config.mjs) |
| Shared site identity and contact routes | [src/config/site.ts](../src/config/site.ts) |
| Shared analytics configuration | [src/config/analytics.mjs](../src/config/analytics.mjs) |
| Content schemas | [src/content.config.ts](../src/content.config.ts) |
| Design tokens and component styles | [tokens.css](../src/styles/tokens.css), [app.css](../src/styles/app.css) |
| Build and asset utilities | [scripts/README.md](../scripts/README.md) |

## Private history

Historical website reviews, implementation records, dependency and workflow assessments, and styles-only design-export records live in the private `burningsuit-ops` repository. They preserve findings, decisions and validation evidence from the work at the time. Their pending items and branch approvals do not establish today's release status or grant new authorisation; dependency assessments are not current audits.

Evidence paths such as `.review-pass/` and `.release-review/` refer to ignored material in the checkout where the work was performed and may be absent from another worktree. Design exports are snapshots; current tokens, styles and runtime behaviour are defined by the source in this repository.

Keep operating instructions here and in the root guidance. Retain new historical reviews and design-export records in `burningsuit-ops`, alongside the private writing brief and business evidence.
