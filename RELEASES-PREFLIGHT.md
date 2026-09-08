# Pre-release verification: `cf_office_hours`

Operational pre-flight checklist. Runs **before** step 1 of
[`RELEASES.md` § Releasing dev to main](./RELEASES.md#releasing-dev-to-main). Gates the cut of the `release/v<version>`
branch, not the daily dev integration. Each box is an explicit go/no-go. If any item is unchecked or red, hold the
release.

No workflow builds or tests this repo on a PR; the three guard workflows are the only checks that run. Everything the
checklist covers is therefore driven from a local checkout of `dev`:

- Build, type-check, lint, and test across every workspace.
- Drift between `main` and `dev` (security PRs land on `main` first).
- The state of the release branch itself: version carriers, changelog, guarded paths, what the release adds to `main`.

Post-merge verification (tag, GitHub Release, staging and production deploys, rollback path, backport) lives in
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). Tagging and deploying happen AFTER the release-branch cut and the
PR-to-main merge, so verification of the deployed Workers is post-flight, not pre-flight.

## Quick start: run the automated gate

The one scripted gate is branch drift. Run it first; nothing else matters while `main` holds changes `dev` never
received.

```bash
scripts/release/drift.sh
```

`scripts/release/drift.sh [--base REF] [--head REF] [--since REF] [--no-fetch]` defaults to `--base origin/dev` and
`--head origin/main` and fetches `origin` first. Exit 0 means no drift, 1 means drift, 2 means a setup error. The rest of
this checklist is run by hand from the recipes below.

## Establish the surface

Everything below assumes you know what's changing. Run this first.

```bash
git fetch origin
LAST_TAG=$(git tag --sort=-version:refname | head -n 1)
git log "$LAST_TAG..origin/dev" --oneline                              # commits going out
git diff "$LAST_TAG..origin/dev" --stat                                # file-level scope
git log "$LAST_TAG..origin/dev" --grep '^[a-z]\+\(([^)]*)\)\?!:' --oneline   # Conventional-Commits breaking markers, scoped or not
```

On a repo with no tags yet, or whose lineage is squash-only so no tag is an ancestor of `dev`, the surface is
`origin/main..origin/dev` instead of `$LAST_TAG..origin/dev`. This repo has no tags until the step in
[`RELEASES.md` § First tagged release](./RELEASES.md#first-tagged-release) runs; use the `origin/main..origin/dev` form
until then.

Every `!:` commit drives the major-version decision and gets a row in the release's `### Breaking changes` section.

## Checklist

### Branch drift (main ahead of dev)

Driven by `scripts/release/drift.sh`.

Security PRs, hotfixes, and config edits land on `main` first. The release branch is cut from `main` and then takes
`dev`'s changes, so anything `main` holds that `dev` never received is reverted by the release or collides with it, and
Dependabot raises the same fix again.

- [ ] Every commit on `main` since the last release has its changes on `dev` (gate 1 lists the ones that do not, as
      `differs` or `missing`). Backport them by PR into `dev` first, merge, and rerun.
- [ ] `.github/` is identical on both branches (gate 2). A difference either way is a config change that only reached
      one branch. Dependabot reads `.github/dependabot.yml` from `main`, so an edit made on `dev` takes effect only
      once the release carries it.
- [ ] No lockfile package resolves newer on `main` than on `dev` (gate 3). Each line is tagged `runtime` (ships in the
      Workers) or `dev` (build and deploy tooling). The one benign case is a version still inside the local npm
      `min-release-age` window when the advisory is already patched at `dev`'s version; check the advisory's patched
      version and wait it out.
- [ ] `dev`-newer packages are the routine weekly updates this release ships; the gate counts them and does not list
      them.

### Build, type-check, lint, test

Run from a clean install of `dev` so the result matches what the release branch will carry.

```bash
npm ci
npm run type-check
npm run lint
npm run format:check
npm run test
npm run build
```

- [ ] `npm run type-check` passes in every workspace.
- [ ] `npm run lint` passes with zero warnings (`--max-warnings 0`).
- [ ] `npm run format:check` passes.
- [ ] `npm run test` passes in `apps/api` and `apps/web`.
- [ ] `npm run build` produces `apps/api/dist/index.js` and the `apps/web` bundle. A plain `build` uses the local API
      URL; the environment-specific `deploy:<env>` scripts rebuild with the right `VITE_API_BASE_URL` at deploy time.
- [ ] `npm run test:e2e` passes against a local `npm run dev` (Playwright is exact-pinned to the version dotfiles
      provisions; a client ahead of the provisioned browsers fails here, not in CI).

### Real-world smoke (local Workers)

The unit tests mock the D1 layer. Exercises that only fire end-to-end against a running Worker belong here.

- [ ] `npm run dev:api` starts, and `curl http://localhost:8787/health` returns `{ "status": "ok", ... }`.
- [ ] `npm run dev:web` starts, the login page renders with the three role buttons, and a demo login lands on the
      dashboard (the same four steps as
      [`DEPLOYMENT_INSTRUCTIONS.md` § Verification](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md#verification), against
      local URLs).
- [ ] Any new file under `apps/api/migrations/` applies cleanly to a fresh local D1 and the seed still loads after it:

  ```bash
  cd apps/api && npx wrangler d1 migrations apply cf-office-hours --local
  ```

- [ ] A protected call (for example `GET /v1/availability`) succeeds with the `Authorization: Bearer` header and no
      CORS error from the local web origin.

### Data and schema

- [ ] Every schema change has a migration file; nothing relies on a hand-applied `wrangler d1 execute`.
- [ ] Migrations are additive or have a documented forward path. A Worker rollback does not roll back D1 (see
      [`RELEASES.md` § Rollback](./RELEASES.md#rollback)), so a destructive migration needs its own plan before the cut.
- [ ] `scripts/bump-seed-dates.sql` still matches the schema if the release changed the tables it touches; the weekly
      cron runs it against staging and production.

### Release mechanics sanity

These items duplicate steps in `RELEASES.md` deliberately: easy to skip, expensive to recover from. Confirm explicitly
on the release branch before pushing it.

- [ ] Version bumped to the new tag value in all five manifests (root, `apps/api`, `apps/web`, `packages/config`,
      `packages/shared`). Five hits expected:

  ```bash
  git grep -n '"version": "<version>"' -- package.json 'apps/*/package.json' 'packages/*/package.json'
  ```

- [ ] `package-lock.json` regenerated (`npm install --package-lock-only`) and committed; `npm ci` on the branch succeeds.
- [ ] Every PR merged into `dev` since `$LAST_TAG` has a non-empty `## Changelog` section. A PR without one lands in
      the changelog as its title under `### Changed`. Spot-check:

  ```bash
  gh pr list --base dev --state merged --search "merged:>$(git log -1 --format=%aI $LAST_TAG)"
  gh pr view <num> --json body
  ```

- [ ] `.nvmrc` last bumped seven or more days ago (supply-chain quarantine). If a bump landed inside the window, hold or
      revert it before tagging.
- [ ] No unmerged dependency advisories: `npm audit --audit-level=high` is clean, and Dependabot has no open security
      PR against `main` that `dev` lacks (the drift gate above lists them).
- [ ] Diff-A and diff-B agree on intended scope: `git diff --cached --name-only origin/dev` filtered by the guarded set
      and the version carriers is empty (not all of `docs/`, since a directory that ships to `main` would hide a missed
      change), and `git diff --cached --name-only origin/main` is the release.
- [ ] **Leak check before pushing the release branch.** No guarded path may surface in the diff vs `origin/main`. The
      set resolves from `.github/workflows/guard-main-docs.yml` via `scripts/release/guarded-paths.sh`; never restate
      the pattern inline.

  ```bash
  GUARDED="$(scripts/release/guarded-paths.sh)"
  git diff origin/main..HEAD --name-only | grep -E "$GUARDED" && echo "LEAKED: reset and redo" || echo "(clean)"
  ```

- [ ] **Every doc this release adds to `main` is meant to ship.** The leak check is blind to a category nobody
      registered. The command below lists the unguarded additions; each one needs a reason to ship, or it gets
      registered in the workflow's `extra_paths` and removed from the branch. Under `docs/`, only `docs/deployment/`,
      `docs/sample_data/`, and `docs/TROUBLESHOOTING.md` ship.

  ```bash
  git diff origin/main..HEAD --diff-filter=A --name-only | grep -E '(^docs/|\.md$)' | grep -Ev "$GUARDED"
  ```

- [ ] `CHANGELOG.md` versioned section has no `[Unreleased]` placeholder and matches the bumped version
      (`scripts/generate-changelog.py --check`).

### Post-merge verification

Moved to [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md) because tagging and deploying happen **after** the
release-branch cut and PR-to-main merge, so verification of the tag, the GitHub Release, the staging and production
Workers, and the backport is post-flight, not pre-flight.

## Related docs

- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). Runs AFTER the merge to verify the tag, deploys, and backport.
- [`RELEASES.md`](./RELEASES.md). Operational runbook this checklist gates.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md). Release-flow rationale.
- [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md). Deploy commands, URLs,
  verification steps.
