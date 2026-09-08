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

# 1. Every file that differs outside docs/. Expect only routine dev-ahead changes.
git diff --name-status origin/dev origin/main -- . ':!docs/'

# 2. Every package whose resolved version differs between the two lockfiles.
#    Lines starting with > are main's side. runtime = ships in the Workers; dev = build and deploy tooling.
diff \
  <(git show origin/dev:package-lock.json  | jq -r '.packages | to_entries[] | "\(.key) \(.value.version) \(if .value.dev then "dev" else "runtime" end)"' | sort) \
  <(git show origin/main:package-lock.json | jq -r '.packages | to_entries[] | "\(.key) \(.value.version) \(if .value.dev then "dev" else "runtime" end)"' | sort)
```

Read the output this way:

- A package where `main` resolves a newer version than `dev` is a security fix that has not been backported. Carry it
  into `dev` first: open a backport PR with the manifest and lockfile changes, merge it, and rerun the diff.
- A package where `dev` is newer is a routine weekly update that has not been released yet. That is expected.
- `.github/dependabot.yml` and anything under `.github/workflows/` should match exactly. A difference there means a
  config change merged to `main` and was not backported.

Do not cut the release branch while step 2 shows a `main`-only newer version.

## Cutting the release branch

```bash
git switch -c release/vX.Y.Z origin/main
git checkout origin/dev -- .
```

Then drop the `dev`-only documentation that the `guard-main-docs` check blocks on `main`: every path listed in
`extra_paths` in `.github/workflows/guard-main-docs.yml` plus the reusable workflow's base list. Use `trash`, then stage
everything:

```bash
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
   that was made on `main` only. Rerun the preflight diff; it should show nothing `main`-only.
2. Deploy from `main` per [`DEPLOYMENT_INSTRUCTIONS.md`](DEPLOYMENT_INSTRUCTIONS.md): install with `npm ci` so the
   bundle matches the lockfile, staging first, then production.
