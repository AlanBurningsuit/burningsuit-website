# Workflow review — 8 September 2026

Production validates the artifact it will publish. The sequence is checkout → Node 22 with npm cache → `npm ci` → `npm run gate` → install Playwright Chromium with OS dependencies → `npm run test:functional` → configure Pages → upload `dist/` → deploy Pages. The gate builds once; functional tests include test type-checking and serve that existing build. No step rebuilds between testing and uploading. The artifact includes `.nojekyll`.

The production build job has `contents: read` and `pages: read` for Pages configuration. Only the deploy job has `pages: write` and `id-token: write`; it requires the build and remains guarded to `refs/heads/main`. The `github-pages` environment and non-cancelling `pages` concurrency group are retained. A manual dispatch from another branch cannot deploy to the apex.

The validation workflow runs the same installation, gate and Chromium functional checks for pushes to `dev` and pull requests targeting `dev` or `main`. Its sole repository permission is `contents: read`; it does not configure Pages, upload a deployment artifact or publish. Linux CI excludes Windows screenshot tests because the committed baselines and browser rendering are platform-specific. Existing CSP tracker/beacon stubs are unchanged.

## Verified action releases

Release tags and their 40-character commit objects were verified through the GitHub API on 8 September 2026. The actions use their supported Node 24 action runtime on `ubuntu-latest`; project commands still run on the Node 22 version installed by setup-node.

| Action release | Pinned commit |
|---|---|
| [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0) | `820762786026740c76f36085b0efc47a31fe5020` |
| [configure-pages v6.0.0](https://github.com/actions/configure-pages/releases/tag/v6.0.0) | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| [upload-pages-artifact v5.0.0](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| [deploy-pages v5.0.1](https://github.com/actions/deploy-pages/releases/tag/v5.0.1) | `368f82528645a54fb793d4d04e342629a3f51346` |

The workflows have been parsed and inspected locally for the required sequence, permissions, triggers, deployment guard, Pages configuration, environment, concurrency and artifact upload. The authorised feature-branch push on 8 September 2026 did not trigger an Actions run: validation runs on PRs targeting `dev`/`main` or pushes to `dev`. A hosted run remains to be verified when one of those events occurs; local inspection is not evidence that GitHub has executed these workflows.

## Dependabot reconciliation

After Alan authorised the push on 8 September 2026, `feat/ownership-redesign` was pushed and its remote head verified at `585d77f`. The four PRs below were inspected live: each targeted `dev` and contained only a one-line edit to the old deployment workflow. All were closed as superseded by the feature branch, without merging their obsolete workflow changes. This does not mean the rewrite has been integrated into `dev` or deployed to production.

| PR | Closed as superseded |
|---|---|
| [#2: deploy-pages 4.0.5 → 5.0.0](https://github.com/AlanBurningsuit/burningsuit-website/pull/2) | Superseded by the verified 5.0.1 release. |
| [#3: configure-pages 5.0.0 → 6.0.0](https://github.com/AlanBurningsuit/burningsuit-website/pull/3) | The 6.0.0 update is incorporated. |
| [#4: withastro/action 4.2.1 → 6.1.2](https://github.com/AlanBurningsuit/burningsuit-website/pull/4) | Obsolete: explicit build, test and artifact-upload steps replace withastro/action. |
| [#6: checkout 4.3.1 → 7.0.1](https://github.com/AlanBurningsuit/burningsuit-website/pull/6) | The 7.0.1 update is incorporated in both workflows. |
