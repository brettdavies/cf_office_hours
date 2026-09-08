# Release Instructions

How a release moves from `dev` to `main`. Deploying what `main` holds is covered separately in
[`DEPLOYMENT_INSTRUCTIONS.md`](DEPLOYMENT_INSTRUCTIONS.md).

## Branch model

- `dev` is the integration branch. Feature branches merge into it by PR. Dependabot version updates target it with one
  grouped PR per week.
- `main` is the default branch and the deploy source. It takes code only by PR, requires a review and signed commits,
  and squash-merges. Dependabot security updates target `main` directly, grouped per run for minor and patch fixes.
- A release is a `release/vX.Y.Z` branch built as a descendant of `main`, merged into `main` by PR, then backported.

## Preflight: drift between `main` and `dev`

Security fixes land on `main` first. The release branch overlays `dev`'s tree onto `main`, so anything `main` carries
that `dev` does not is reverted by the release. Dependabot then reopens the alert and raises the same fix again. Run
this before cutting the branch, every time.

```bash
git fetch origin

# 1. Every file that differs outside docs/. Expect manifests and the lockfile (routine dev-ahead
#    updates) and nothing under .github/.
git diff --name-status origin/dev origin/main -- . ':!docs/'

# 2. What main carries that dev never received, in three gates. Exits 1 while any exist,
#    so it doubles as a gate.
scripts/release/drift.sh
```

The script is vendored verbatim from the github-repo-setup skill. Gate 1 lists every commit on `main` since the last
release and flags files whose change `dev` does not contain. Gate 2 requires `.github/` to match on both branches.
Gate 3 collapses each lockfile to one entry per package name, so nested copies and hoisting moves do not appear, and
lists only what `main` resolves newer; each line is tagged `runtime` (ships in the Workers) or `dev` (build and deploy
tooling). Read the output this way:

- A package where `main` is newer is a fix that arrived through a security PR and has not been backported. Carry it
  into `dev` first: open a backport PR with the manifest and lockfile changes, merge it, and rerun the script.
- The count of packages where `dev` is newer is the routine weekly updates waiting for this release. That is expected
  and the script does not list them.
- A `main`-newer line whose version is younger than seven days is the local npm `min-release-age` holding `dev` one
  step behind a security PR, which has no cooldown. Check the advisory's patched version; if `dev` already meets it,
  the line can be waited out.
- Any file under `.github/` in step 1 means a config change merged to `main` and was not backported.

Do not cut the release branch while the script exits 1 for a reason other than the release-age window.

## Cutting the release branch

```bash
git switch -c release/vX.Y.Z origin/main
git checkout origin/dev -- .
```

Then drop the `dev`-only documentation that the `guard-main-docs` check blocks on `main`. The set resolves from
`.github/workflows/guard-main-docs.yml` through the vendored script, so a path registered there is never missed here:

```bash
GUARDED="$(scripts/release/guarded-paths.sh)"
git ls-files | grep -E "$GUARDED" | xargs -r trash
git add -A
npm version X.Y.Z --no-git-tag-version --workspaces --include-workspace-root
npm install --package-lock-only
git add -A
```

Before committing, confirm the branch differs from `main` only in the intended ways:

```bash
# Only docs/deployment/ and docs/TROUBLESHOOTING.md may appear under docs/
git diff --name-only origin/main | grep '^docs/'
# The version bump and the dev-ahead changes, nothing else
git diff --stat origin/main
```

Commit as one commit on top of `main`, push, and open the PR into `main` with a title of the form `type: release vX.Y.Z
(one-line summary)`.

## After the merge

1. Backport to `dev`: a `chore: sync version to X.Y.Z (backport from main)` PR carrying the version bump and any edit
   that was made on `main` only. Rerun `scripts/release/drift.sh`; it should exit 0.
2. Deploy from `main` per [`DEPLOYMENT_INSTRUCTIONS.md`](DEPLOYMENT_INSTRUCTIONS.md): install with `npm ci` so the
   bundle matches the lockfile, staging first, then production.
