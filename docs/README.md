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
| Styles-only design import | [conventions](../.design-sync/conventions.md), [export notes](../.design-sync/NOTES.md) |

## Historical records

These records retain their original findings, decisions and validation evidence. Pending items and branch authorisations describe the work at the time; they do not establish today's release status. Local evidence paths such as `.review-pass/` and `.release-review/` refer to ignored material in the checkout where the work was performed and may be absent from another worktree.

| Record | Period and purpose |
|---|---|
| [Design review and acceptance](archive/ownership-preview-review.md) | 8 September 2026: rejected comparison treatments, retained design and local acceptance. |
| [Redesign brief](archive/ownership-redesign-review.md) | 8 September 2026: buyer flow, page actions and editorial decisions. |
| [Redesign implementation](archive/ownership-redesign-implementation.md) | 8–22 September 2026: implementation, follow-ups, validation and publication metadata. |
| [Workflow review](archive/workflow-review.md) | 8 September 2026: pinned action verification and Dependabot reconciliation. |
| [Dependency review](archive/dependency-review.md) | 8 September 2026: dependency updates and residual advisory assessment; not a current audit. |
| [Design-sync import](archive/design-sync-import-2026-07-20.md) | 20 July 2026: original styles-only import, provenance and historical rebuild recipe. |

Keep new operating instructions in the current guidance. Add dated reviews to `docs/archive/` when retaining a decision or validation record; do not turn an old review into the current task list.
