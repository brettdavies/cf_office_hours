# Post-release verification: `cf_office_hours`

Operational post-flight checklist. Runs **after** the `release/v<version> → main` PR merges, per
[`RELEASES.md` § Tagging and publishing](./RELEASES.md#tagging-and-publishing). Verifies that the tag and GitHub Release
exist, that each Worker deployed cleanly to staging and then production, that a rollback is one command away, and that
the release bookkeeping made it back to `dev`.

Companion to [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md), which gates the release-branch cut. Both docs follow
the same go/no-go shape: every box is explicit, an unchecked or red item holds the next release (or motivates a hotfix).

No script drives this checklist. Nothing in the repo deploys from CI: the tag push triggers no workflow, and each Worker
is deployed by hand with `wrangler`, so every gate below is a command run from the tagged `main` checkout or a check
against the live URLs.

## Checklist

Run in order. Staging comes before production, and the last-good identifier is recorded before production moves.

### Tag and Release

- [ ] **Annotated tag on `main`.** `git describe --tags --exact-match origin/main` prints `v<version>`, and
      `git cat-file -t v<version>` prints `tag` (an annotated tag, not a lightweight one).
- [ ] **GitHub Release published.** `gh release view v<version> --json isDraft,tagName --jq '{isDraft, tagName}'`
      shows `isDraft: false`. `scripts/sync-dev-after-release.sh` refuses to run while the Release is missing or draft.
- [ ] **Release notes match `CHANGELOG.md`.** The Release body is the `## [<version>]` section verbatim; a mismatch
      means the notes were extracted from the wrong section or the changelog changed after tagging.

### Staging

- [ ] **Install from the lockfile.** `npm ci` on the tagged `main` checkout, so the bundle matches what the release PR
      reviewed.
- [ ] **D1 migrations applied to staging.** If the release added a file under `apps/api/migrations/`, the list shows
      none pending:

  ```bash
  cd apps/api && npx wrangler d1 migrations list cf-office-hours --env staging --remote
  ```

- [ ] **API Worker deployed.** `npm run deploy:staging --workspace=apps/api` succeeds and prints the deployed version.
- [ ] **Web Worker deployed.** `npm run deploy:staging --workspace=apps/web` succeeds; the build step baked the staging
      `VITE_API_BASE_URL`.
- [ ] **Staging verification list passes.** The four steps in
      [`DEPLOYMENT_INSTRUCTIONS.md` § Verification](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md#verification) against
      the staging URLs: `/health` returns `ok`, the login page renders, a demo login returns a JWT and lands on the
      dashboard, and a protected call succeeds without a CORS error.
- [ ] **Weekly cron still registered.** `npx wrangler deployments list --env staging` from `apps/api` shows the current
      deployment, and the `0 9 * * 1` trigger is present in the Worker's settings (the seed-date bump depends on it).

### Production

- [ ] **Last-good identifier recorded.** Before deploying, note the current production deployment id for each Worker
      (`npx wrangler deployments list --env production` from `apps/api` and from `apps/web`) somewhere reachable under
      incident pressure, so a rollback is a single command. See [`RELEASES.md` § Rollback](./RELEASES.md#rollback).
- [ ] **D1 migrations applied to production.** Same check as staging with `--env production`.
- [ ] **API Worker deployed.** `npm run deploy:production --workspace=apps/api` succeeds.
- [ ] **Web Worker deployed.** `npm run deploy:production --workspace=apps/web` succeeds.
- [ ] **Production verification list passes.** The same four steps against `https://api.officehours.youcanjustdothings.io`
      and `https://officehours.youcanjustdothings.io`.
- [ ] **Rollback path confirmed.** `npx wrangler deployments list --env production` shows the previous deployment for
      each Worker directly below the new one, so `npx wrangler rollback --env production` re-points to it. If this
      release is bad, roll back at the Worker first, then land a `fix` or `revert` through the normal `dev` to
      `release/*` to `main` flow so `main` reconverges with what is live.

### Backport

- [ ] **Backport `main` → `dev` via a merged PR to `dev` with the version in its title.** Run
      `scripts/sync-dev-after-release.sh v<version>`, then add the workspace manifests and lockfile to the same branch
      (the script writes only the root `package.json` and `CHANGELOG.md`; the recipe is in
      [`RELEASES.md` § After publish](./RELEASES.md#after-publish-sync-dev-with-the-release)). Merge once the guards
      are green. Keeps the next release's diff-B quiet so a real missed change stands out instead of hiding in expected
      divergence noise.
- [ ] **Drift gate exits 0.** `scripts/release/drift.sh` after the backport merges: no `main` commit whose changes
      `dev` lacks, `.github/` identical, no package newer on `main`.

## Related docs

- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut go/no-go checklist (runs BEFORE this one).
- [`RELEASES.md`](./RELEASES.md): operational runbook for the full release lifecycle.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md): release-flow rationale.
- [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md): deploy commands, URLs,
  verification steps, troubleshooting.
