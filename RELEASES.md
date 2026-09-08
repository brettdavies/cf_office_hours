# Releasing `cf_office_hours`

Operational runbook. Rationale lives in [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md). Pre-cut go/no-go checklist
lives in [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md); post-merge deploy verification lives in
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). Deploying what `main` holds is covered in
[`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md).

```text
feature branch → PR to dev (squash merge)
              → release/v<version> branch built from main with dev's tree overlaid
              → PR to main (squash merge)
              → annotated tag + GitHub Release
              → wrangler deploy per Worker: staging, verify, then production
              → sync PR back to dev
```

Direct commits to `dev` or `main` are not permitted: every change has a PR number in its squash commit message.

## Branches

| Branch                                 | Role                                              | Lifetime                                    | Protection                    |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| `main`                                 | Production. Default branch and the deploy source. | Forever.                                    | `Protect main` ruleset        |
| `dev`                                  | Integration. All feature PRs land here.           | Forever. Never delete.                      | `Protect dev` ruleset         |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Feature work.                                     | One PR's worth. Auto-deleted on merge.      | None. Squash into dev freely. |
| `release/*`                            | Head of a dev → main PR.                          | One release's worth. Auto-deleted on merge. | None.                         |

Dependabot version updates target `dev` with one grouped PR per ecosystem per week. Dependabot security updates target
`main` directly, grouped per run for minor and patch fixes; `scripts/release/drift.sh` is what carries them into the
next release (see [§ Releasing dev to main](#releasing-dev-to-main)).

→ Rationale: [`RELEASES-RATIONALE.md` § Branching model](./RELEASES-RATIONALE.md#branching-model).

## Daily development (feature → dev)

```bash
git checkout dev && git pull
git checkout -b feat/short-description
# ... work ...
git push -u origin feat/short-description
gh pr create --base dev --title "feat(scope): what changed"
# CI passes → squash-merge (PR_BODY becomes the dev commit message)
```

- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/).
- **PR body**: follow `.github/pull_request_template.md`. See [§ PR body](#pr-body).

### Dev-direct exception

Paths that live only on `dev` and never ship to `main` can be committed directly to `dev` without a feature branch or
PR. The `guard-main-docs` workflow blocks them from `main` PRs regardless. The set is the reusable workflow's base list
plus this repo's `extra_paths` in `.github/workflows/guard-main-docs.yml` (the archived planning corpus under
`docs/archive/`, the loose dev-only files at `docs/` root, and `docs/DOCUMENTATION-GUIDE.md`);
`scripts/release/guarded-paths.sh` prints the resolved set.

The standard feature → PR → squash-merge flow remains required for everything else, including consumer-facing markdown
(README, `docs/deployment/`, `docs/TROUBLESHOOTING.md`, this runbook and its companions).

## PR body

Every PR (feature, fix, docs, release) uses `.github/pull_request_template.md` verbatim. Six sections, no inventions:
`## Summary`, `## Changelog`, `## Type of Change`, `## Related Issues/Stories`, `## Files Modified`, `## Testing`.

- **No explainer prose anywhere in the body.** User-facing substance only.
- **Summary describes the net diff only**: what merged `main` looks like vs the base branch. Not commit history or
  intermediate state.
- **Zero verification artifacts in the body.** No diff stats, leak-check output, pre-push gate results, CI status, or
  prose-scrub findings. Anomalies get fixed before push, not audit-trailed.
- **Changelog** subsections (`### Added` / `### Changed` / `### Fixed` / `### Documentation`): 1-5 bullets each, delete
  empty subsections, each bullet starts with a verb.
- **Type of Change**: one checkbox. Prefer `feat`/`fix` over `chore` for any user-observable change.
- **Related Issues/Stories**: four labels (`Story:` / `Issue:` / `Architecture:` / `Related PRs:`). All four required
  even when empty (`- None.` / `n/a`).
- **Files Modified**: four sub-headers (`Modified` / `Created` / `Renamed` / `Deleted`). All four required even when
  empty.
- **No AI attribution** in commits or PR bodies.
- **No hard line wraps**: one logical line per paragraph or bullet.

→ Rationale: [`RELEASES-RATIONALE.md` § PR body conventions](./RELEASES-RATIONALE.md#pr-body-conventions).

## Releasing dev to main

Before cutting a release branch, walk [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md) end-to-end. Any unchecked item
holds the release.

Engineering docs live on `dev` only. `guard-main-docs.yml` blocks them from reaching `main`, and
`guard-release-branch.yml` rejects any PR to main whose head isn't `release/*`.

**Branch naming**: `release/v<version>` or `release/v<version>-<slug>`. `generate-changelog.py` extracts the version
from the branch name, so the `v<version>` prefix is required.

`main` and `dev` share only an ancient merge-base: every release squash-merges into `main`, so the two branches diverge
in history even as their content converges. Reconciling that with a merge, or a branch cut from `dev`, produces a pile
of rename/delete and lockfile conflicts that are artifacts of the lineage, not of the content shipping. The release
branch is therefore built as a **clean descendant of `main`** with `dev`'s tree overlaid on top, asserting the desired
end-state directly:

```bash
# 0. Nothing on main that dev never received (security PRs, hotfixes, config). Exits 1 while drift exists.
scripts/release/drift.sh

# 1. Branch from main, NOT dev.
git fetch origin
git checkout -B release/v<version> origin/main

# 2. Overlay dev's entire tracked tree onto the main base. `checkout -- .` writes dev's
#    paths but does not delete files that exist on main and are absent on dev, so remove
#    those next (the 'D' rows are main-only files dev deleted).
git checkout origin/dev -- .
git diff --name-status origin/main origin/dev | grep '^D'
trash <each main-only file listed above>

# 3. Strip the paths guard-main-docs forbids on main. The set resolves from the workflow;
#    never restate it inline, because every hand-kept copy drifted from what CI enforces.
GUARDED="$(scripts/release/guarded-paths.sh)"
git ls-files | grep -E "$GUARDED" | xargs -r trash
git add -A                                                      # stages adds, mods, AND deletions

# 4. Bump every workspace manifest and the lockfile together, then build the changelog
#    from the PRs merged into dev since the previous release. The overlay commit carries
#    no per-PR history, so the section is built from dev's PRs, not from this branch's commits.
npm version <version> --no-git-tag-version --workspaces --include-workspace-root
npm install --package-lock-only
scripts/generate-changelog.py --from-dev-prs
git add -A

# 5. Verify before committing.
#    A: staged tree equals dev's minus the version carriers and the stripped guarded paths.
#       Anything else printed here is a mistake.
git diff --cached --name-only origin/dev | grep -Ev "$GUARDED" \
  | grep -Ev '^(package\.json|package-lock\.json|(apps|packages)/[^/]+/package\.json|CHANGELOG\.md)$' \
  && echo "unexpected delta above; investigate" || echo "(clean: only intended deltas)"
#    B: no guarded path in the release tree.
git diff --cached --name-only origin/main | grep -E "$GUARDED" \
  && echo "LEAKED a guarded path: reset and redo" || echo "(no guarded paths)"
#    D: what this release ADDS to main. The leak check screens against the registered
#       set, so it is blind to a category nobody registered yet. Every docs/ entry and
#       every added markdown file needs a reason to ship, or it needs registering in the
#       workflow's extra_paths and removing from the branch. Under docs/, only
#       docs/deployment/, docs/sample_data/, and docs/TROUBLESHOOTING.md ship.
git diff --cached --diff-filter=A --name-only origin/main | grep -E '(^docs/|\.md$)' | grep -Ev "$GUARDED" || echo "(none unguarded)"

# 6. Commit the overlay as one commit sitting directly on top of main, then confirm main
#    still holds nothing dev lacks.
git commit
scripts/release/drift.sh

# 7. Push and open the PR. Scrub body in /tmp/ first.
git push -u origin release/v<version>
gh pr create --base main --head release/v<version> --title "release: v<version>" --body-file /tmp/body.md
```

The result is a single commit whose diff against `main` is the release, with `main` as an ancestor, so the PR merges
with zero conflicts. Auto-delete removes `release/v<version>` from the remote on merge. `dev` is untouched. Nothing
deploys on merge: the deploy is a manual `wrangler` step after tagging (next section).

→ Rationale (why overlay, not merge; why cut from `main`):
[`RELEASES-RATIONALE.md` § Branching model](./RELEASES-RATIONALE.md#branching-model). CHANGELOG mechanics:
[`RELEASES-RATIONALE.md` § CHANGELOG generation](./RELEASES-RATIONALE.md#changelog-generation).

## Tagging and publishing

After the `release/v<version> → main` PR merges, tag, push the tag, and create the GitHub Release from the
`CHANGELOG.md` section. No workflow fires on the tag; the Release is the durable record that the version shipped, and
`scripts/sync-dev-after-release.sh` refuses to run until it exists.

```bash
git checkout main && git pull
git tag -a -m "Release v<version>" v<version>
git push origin v<version>

awk -v v="<version>" '/^## \[/ { p = index($0, "[" v "]") > 0 } p' CHANGELOG.md > /tmp/release-notes-v<version>.md
gh release create v<version> --title "v<version>" --notes-file /tmp/release-notes-v<version>.md
trash /tmp/release-notes-v<version>.md
```

Always use annotated tags (`-a -m`).

### Deploy

Deploy from the tagged `main` checkout, one Worker at a time, staging first. Install with `npm ci` so the bundle matches
the lockfile. Record the current production deployment id for each Worker before deploying production; it is the
rollback target (see [§ Rollback](#rollback)).

```bash
npm ci

# Staging, then walk the Verification list in docs/deployment/DEPLOYMENT_INSTRUCTIONS.md.
npm run deploy:staging --workspace=apps/api
npm run deploy:staging --workspace=apps/web

# Production, then walk the same list against the production URLs.
npm run deploy:production --workspace=apps/api
npm run deploy:production --workspace=apps/web
```

A release that adds a file under `apps/api/migrations/` needs `npx wrangler d1 migrations apply cf-office-hours --env
<env> --remote` from `apps/api` before that environment's API deploy.

→ Full deploy procedure, URLs, secrets, and troubleshooting:
[`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md). Rationale:
[`RELEASES-RATIONALE.md` § Release pipeline](./RELEASES-RATIONALE.md#release-pipeline).

### After publish: sync `dev` with the release

Once the GitHub Release exists, bring the release bookkeeping (version carriers, `CHANGELOG.md`) back to `dev` so the
integration branch starts from the released baseline:

```bash
scripts/sync-dev-after-release.sh v<version>
```

The script writes the root `package.json` and copies `CHANGELOG.md`, then opens a PR against `dev`. The workspace
manifests and the lockfile are not among the carriers it writes, so bring them along on the same branch before merging:

```bash
git switch chore/sync-dev-after-v<version>
npm version <version> --no-git-tag-version --workspaces --include-workspace-root
npm install --package-lock-only
git add -A && git commit    # "chore(release): sync workspace manifests to v<version>"
git push
```

Merge the PR once the guards are green, then run `scripts/release/drift.sh`; it exits 0 when `dev` holds everything
`main` does. Never merge `main` into `dev` or push to `dev` directly: the squash-merged histories share no recent
ancestry, so the merge conflicts on every file both sides touched, and a direct push bypasses `dev`'s ruleset.

→ Rationale: [`RELEASES-RATIONALE.md` § Release pipeline](./RELEASES-RATIONALE.md#release-pipeline).

## Rollback

A bad release is rolled back at the Worker first, then repaired in git. Rollback re-points what users get; it does not
revert history. After rolling back, land a `fix/*` or `revert` through the normal `dev` to `release/*` to `main` flow
so `main` matches what is live. Knowing the last-good deployment id before the release goes out is a
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md) gate.

Wrangler keeps prior versions of each Worker. Roll back each affected Worker independently:

```bash
cd apps/api   # or apps/web
npx wrangler deployments list --env production
npx wrangler rollback --env production [<version-id>]
```

Without a version id, `wrangler rollback` re-points the Worker at the deployment before the current one. A D1 migration
is not rolled back by a Worker rollback; a release that changed the schema needs a forward migration instead.

→ Rationale: [`RELEASES-RATIONALE.md` § Rollback](./RELEASES-RATIONALE.md#rollback).

## Prose scrubbing

Three release-flow artifacts live outside any automated prose check and need a manual scrub before they ship:

- PR bodies (`gh pr create` / `gh pr edit` send body text directly to GitHub).
- `CHANGELOG.md` (a generated artifact built from upstream PR bodies).
- Release-PR bodies (composed after `CHANGELOG.md` has been generated).

```bash
# 1. Save the artifact to /tmp/.
gh pr view <num> --json body --jq .body > /tmp/body.md         # for PR body edits
# cp CHANGELOG.md /tmp/body.md                                 # for changelog scrub

# 2. unslop (em-dash density and AI-unique structural patterns).
~/.claude/skills/unslop/scripts/score.py /tmp/body.md

# 3. Apply fixes per finding. Re-run until the score is 0.

# 4. Apply the cleaned version.
gh pr edit <num> --body-file /tmp/body.md     # for PR body edits
```

For a `CHANGELOG.md` finding, fix the upstream PR body (which `generate-changelog.py` re-fetches every run) and
regenerate. Hand-editing `CHANGELOG.md` directly produces drift the next regeneration overwrites.

→ Rationale + which artifacts need this:
[`RELEASES-RATIONALE.md` § Prose scrubbing scope](./RELEASES-RATIONALE.md#prose-scrubbing-scope).

## Branch protection

Two rulesets are applied to the repo through the GitHub API; their JSON is not kept in-tree.

- `Protect main`: pull requests only, one approving review, squash merges only, required signatures, linear history,
  creation, deletion, and non-fast-forward blocked. No status check is required yet; the three guard workflows report
  on every PR to `main` and are the candidates: `guard-docs / check-forbidden-docs`,
  `guard-provenance / check-provenance`, `guard-release / check-release-branch-name`.
- `Protect dev`: required signatures, deletion blocked, non-fast-forward blocked. PR-only is convention plus
  `guard-release-branch` on the main side.

```bash
gh api repos/brettdavies/cf_office_hours/rulesets            # list, with ids
gh api repos/brettdavies/cf_office_hours/rulesets/<id>       # inspect one
```

→ Status-check context strings (inline vs reusable):
[`RELEASES-RATIONALE.md` § Status-check context strings](./RELEASES-RATIONALE.md#status-check-context-strings).

## Project specifics

### Version carriers

Five manifests carry the version and move together: `package.json` at the root plus `apps/api`, `apps/web`,
`packages/config`, and `packages/shared`. `package-lock.json` holds a `version` entry for each. The bump command in the
overlay recipe writes all of them; a bump that touches only the root is incomplete.

### Required secrets

| Name                   | Where                                   | Used by                                               |
| ---------------------- | --------------------------------------- | ----------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | Shell environment on the deploy machine | `wrangler deploy`, `wrangler rollback`, D1 migrations |
| `JWT_SECRET`           | Worker secret, per environment          | The API at runtime (`wrangler secret put`)            |

### Distribution channels

| Channel          | Staging                                                     | Production                                      |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| API Worker       | `https://cf-office-hours-api-staging.<account>.workers.dev` | `https://api.officehours.youcanjustdothings.io` |
| Web Worker (SPA) | `https://cf-office-hours-web-staging.<account>.workers.dev` | `https://officehours.youcanjustdothings.io`     |

Both Workers deploy by hand with `wrangler`; there is no deploy workflow and no Pages integration. The web bundle bakes
`VITE_API_BASE_URL` at build time, so each environment has its own `deploy:<env>` script and a plain `npm run build` is
never what gets deployed.

### First tagged release

The repo carries no tags: earlier releases were PRs to `main` titled `<type>: release vX.Y.Z (...)`. Both
`generate-changelog.py --from-dev-prs` and `scripts/release/drift.sh` anchor their window on the newest `v*` tag, and
without one the changelog window opens at the first PR ever merged into `dev`. Before cutting the first overlay release,
tag the most recent release commit on `main` (`git log --oneline origin/main | grep 'release v'`) with an annotated tag
and push it, so the window starts there.

## Related docs

- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut go/no-go checklist gating release-branch creation.
- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md): post-merge tag, deploy, and backport verification.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md), release-flow rationale: branching, PR body, pipeline, prose-check.
- [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](docs/deployment/DEPLOYMENT_INSTRUCTIONS.md): one-time setup, deploy
  commands, verification, troubleshooting.
- [`.github/pull_request_template.md`](.github/pull_request_template.md): PR body structure with changelog sections.
- [`README.md`](README.md): project overview and local setup.
