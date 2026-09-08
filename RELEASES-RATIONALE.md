# Releases rationale

Companion to [`RELEASES.md`](./RELEASES.md). RELEASES.md is the runbook (commands, paths, decision tables). This file
holds the WHY behind those rules: branching model, PR conventions, release pipeline, CHANGELOG generation, prose-check
pipeline, branch-protection pitfalls.

Read this when:

- A rule in RELEASES.md doesn't make sense and you're tempted to change it.
- A new contributor asks "why do we do X this way".
- You're adding a new release-flow rule and need to know where it fits the existing model.

## Branching model

### Forever `dev`, ephemeral release branches

`dev` is never deleted, even after a release. The next release cycle reuses the same `dev`. The repo's
`deleteBranchOnMerge: true` setting doesn't touch `dev` as long as `dev` is never the head of a PR. Using a short-lived
`release/*` head is what keeps the setting compatible with a forever integration branch.

Engineering docs (the architecture shards, the archived planning corpus, the loose dev-only notes under `docs/`) live on
`dev` only. They never reach `main`. `guard-main-docs.yml` blocks them from PRs targeting `main`, and
`guard-release-branch.yml` rejects any PR to main whose head isn't `release/*`.

### Why the release branch is cut from `main`, never from `dev`

Every release squash-merges into `main`, so `dev` and `main` diverge in history even as their content converges: after
the first release they share only an ancient merge-base. Cutting the release branch from `dev` (or merging `dev` into
`main`) forces a 3-way merge across that divergence: `add/add` collisions on files both sides changed, plus
rename/delete pairs git cannot auto-resolve. The conflict pile is an artifact of the lineage, not of the content
shipping.

Always cut the release branch from `origin/main` and bring `dev`'s content onto it as a forward diff, never by
reconciling histories. The construction is the whole-tree overlay (`git checkout origin/dev -- .`, then strip the
guarded set): `main` ships `dev`'s tree minus a small, known exclusion set, so asserting that end-state directly is
simpler and safer than hand-resolving a merge. The overlay commit carries no per-PR history, so the changelog is built
from the PRs merged into `dev` since the previous release (`generate-changelog.py --from-dev-prs`) rather than from the
branch's commits; the result is the same per-PR section a cherry-picked branch would yield. This repo has no reason it
cannot overlay, so cherry-picking is not a construction it uses.

The release must start from a `main` that `dev` fully contains. Security PRs, hotfixes, and config edits land on `main`
first, and the overlay takes `dev`'s content for the files they touch, so anything `main` holds that `dev` never
received is reverted by the release. `scripts/release/drift.sh` lists that set and the cut waits until it is empty.
Dependabot security updates are the routine source: they target the default branch, `main`, and never reach `dev` on
their own.

### Version branch naming

Branch naming `release/v<version>` or `release/v<version>-<slug>` makes release branches sortable and unambiguous when
multiple cuts are in flight. `generate-changelog.py` extracts the version from the branch name, so the `v<version>`
prefix is required. Slug is kebab-case, short, descriptive.

## PR body conventions

### No explainer prose in the body

Every section of a PR body is user-facing substance only: the **net diff**, what is changing for the consumer that was
not already there, not the commit history or intermediate state that produced it. Workflow mechanics (overlay,
regenerate, gate results, CI behavior) are documented in RELEASES.md and `.github/`, NOT in the PR body. Diff output,
leak-check narration, gate results, CI check status, exclusion rationale, and other verification artifacts stay local;
anomalies get fixed before push, not audit-trailed in the body.

The PR body is read by humans reviewing what shipped. Workflow mechanics and tool-fix provenance are noise from that
perspective; they belong in this file, the script outputs, and the commit history respectively.

### Why `feat`/`fix` are preferred over `chore`

`cliff.toml` drops commits whose subject starts with `chore`, `style`, `test`, `ci`, or `build` regardless of body
content, and `generate-changelog.py` applies the same rule to a PR title when the PR body carries no `## Changelog`.
Mistyping a user-facing change as `chore` silently strips it from release notes. Prefer `feat` / `fix` when the change
has any user-observable effect (config defaults, env vars, default behaviors, new endpoints, response shape changes).

Security advisory bumps in particular use `fix(deps):`, never `chore(deps):`, so they appear in the changelog. A bumped
dependency that closes a CVE is user-visible value, not internal tooling.

### Why required-when-empty sub-headers

`Related Issues/Stories` has four labels (`Story:` / `Issue:` / `Architecture:` / `Related PRs:`). `Files Modified` has
four sub-headers (`Modified` / `Created` / `Renamed` / `Deleted`). All four must appear in every PR, even when empty:
write `- None.` or `n/a` rather than deleting the label. Reason: scanners and humans both rely on a known section shape.
Conditionally-absent sections force every reader to mentally check "did the author skip this or does it not apply?"

### Why no AI attribution

`Co-Authored-By: Claude ...`, robot emoji / "Generated with Claude Code" trailers, or any similar AI-attribution trailer
is banned from commit messages and PR bodies. Commits and PRs stand on their own technical content. Attribution trailers
are noise and they age poorly as tools shift.

### Why no hard line wraps

Author each paragraph and each bullet as one logical line, however long. GitHub soft-wraps for display. Hard wraps
within prose produce visible mid-sentence breaks in some renderers and interfere with prose checks that report findings
per line.

### Why release-PR bodies repeat changelog entries from upstream PRs

The release PR carries the same `### Added` / `### Changed` / `### Fixed` / `### Documentation` bullets as the feature
PRs it ships. The repetition is intentional and harmless: `cliff.toml` skips the `release:` squash commit, and
`--from-dev-prs` reads `dev`'s PRs rather than `main`'s commits, so the release-PR squash commit can't be double-counted
in any future regeneration.

### Why internal-tooling commits don't appear in `## Changelog`

`chore(cliff): ...`, `chore(ci): ...`, and similar internal-tooling commits don't appear in the PR body's `##
Changelog`. They are not user-facing. They belong in commit history and in the Files Modified section of the PR body,
not in the source-of-truth release notes.

## Release verification

The overlay recipe runs three checks before the release commit (A: staged tree against `dev`, B: guarded paths against
`main`, D: what the release adds to `main`). A and B together prove the branch is `dev`'s tree minus the guarded set
and plus the version bump; D puts everything else in front of a human.

### Why the guarded set resolves from the workflow

`guard-main-docs` is what CI enforces on a PR to `main`: the reusable workflow's hardcoded base list plus this repo's
`extra_paths`. Every hand-kept copy of that union (runbook, checklist, preflight script) drifted from it, and a copy
that omits a guarded path reports a real leak as clean while CI turns red after the push.
`scripts/release/guarded-paths.sh` reads `extra_paths` out of the caller workflow and adds the base list, so
registering a path in the workflow is the only edit a new guarded path needs. The base list is the one copy that still
needs a manual edit when the reusable changes, because it lives in another repo. Entries are globs with one rule set
shared by the reusable and the script (`**/` any depth, `*` and `?` within a segment, trailing slash guards the
subtree), so `**/.agent/` guards that directory wherever it appears and the two never disagree about what is guarded.

### Why the release enumerates what it adds

The leak check screens the diff against the registered set, so it says nothing about a category nobody registered. A
new engineering directory or a stray note under `docs/` passes the local check and `guard-main-docs` alike. Step D
lists every `docs/` file and every markdown file the release adds to `main` outside the guarded set and puts them in
front of a human; each one needs a reason to ship, or it gets registered in `extra_paths` and dropped from the branch.
Root-level markdown is in scope because an agent-facing glossary at the repo root is exactly the kind of addition a
`docs/`-only listing misses.

## CHANGELOG generation

### Generated, never hand-written

`scripts/generate-changelog.py` (vendored from the `github-repo-setup` skill, with the repo-local `cliff.toml`) is the
only sanctioned way to update `CHANGELOG.md`. On the overlay-built release branch it runs as `--from-dev-prs`: the PRs
merged into `dev` since the previous release are the entries, and each PR's body supplies its `## Changelog → ###
Breaking changes / Added / Changed / Fixed / Documentation` subsections (with author and PR-link attribution).

If a PR's body carries no changelog content, its title becomes a `Changed` bullet, except for `chore`, `ci`, `build`,
`style`, and `test` PRs, which stay out unless they carry a `## Changelog` of their own. To fix a wrong CHANGELOG entry,
fix the input: edit the squash-merged PR body, then re-run the script. Do **not** edit `CHANGELOG.md` directly.

No workflow checks `CHANGELOG.md` on a PR to `main`; the release PR's reviewer does, and
`scripts/generate-changelog.py --check` confirms the file has a versioned section rather than `[Unreleased]`. The
GitHub Release body is that section, extracted by version, never by position.

### Why the window anchors on a tag

`--from-dev-prs` needs to know where the previous release ended. It takes the newest `v*` tag, and the earlier of that
tag's commit time and the previous release PR's creation time, as the start of the window; PR numbers the changelog
already lists are dropped afterwards, which covers the overlap. Without any tag the window opens at the first PR ever
merged into `dev`, which is why the first tagged release starts by tagging the previous release commit on `main`
([`RELEASES.md` § First tagged release](./RELEASES.md#first-tagged-release)). `scripts/release/drift.sh` anchors the
same way, falling back to the newest `main` commit whose subject contains `release vX.Y.Z`.

### Why `cliff.toml` skips chore/style/test/ci/build

These commit types do not produce user-facing content. If a PR has user-facing `## Changelog` content but its title
starts with one of those types, its bullets are still read from the body; only a body without a `## Changelog` falls
back to the title, and there the type decides. After running the script, cross-check the generated section against `gh
pr view <num> --json body` for each PR in the window and fix mistyped titles or missing bodies at the source.

## Release pipeline

### Annotated tags

Always use annotated tags (`-a -m`). Bare `git tag <name>` silently fails with `fatal: no tag message?` on machines
where `tag.gpgsign=true` is set globally.

### Why the GitHub Release is created by hand

No workflow runs on the tag push. The two Workers deploy with `wrangler` from a local checkout, and there is no
registry or package to publish, so a release pipeline would exist only to create the GitHub Release. The Release is
still created, from the tag's `CHANGELOG.md` section, because it is the durable, public record that the version
shipped: `scripts/sync-dev-after-release.sh` checks for it before backporting, and it is where a consumer looks for
notes.

### Why deploys are manual, staging first

Each environment has its own build. The web bundle bakes `VITE_API_BASE_URL` at build time, so the staging and
production artifacts differ and a plain `npm run build` is never what ships. Deploying staging first, with the same
tagged checkout and the same `npm ci`, exercises the real build and the real Worker bindings (D1, the cron trigger,
custom domains) before production sees them. Recording each Worker's production deployment id before the production
deploy is what makes the rollback a single command under incident pressure.

### Why backport `main` → `dev` after publish

Once the GitHub Release exists, the release-bookkeeping files on `main` (version bump, lockfile, `CHANGELOG.md`) need to
reach `dev` so future builds from `dev` report the released version and so the next dev work starts from the released
baseline.

The backport is a PR opened by `scripts/sync-dev-after-release.sh`, never a merge of `main` into `dev` and never a
direct push. The squash-merged branches share no recent history, so a merge conflicts on every file both sides
touched, and a direct push to `dev` bypasses its ruleset. The script writes the released version into the root
`package.json`, copies `CHANGELOG.md` from `main`, and opens the PR. The four workspace manifests and the lockfile are
outside the carriers it knows, so they are bumped on the same branch by hand with the same `npm version` command the
release used; the merged PR is the durable signal that the backport ran.

### Rollback

Rollback happens at the surface users consume (the Worker deployment), not in git. Re-pointing a Worker at its previous
deployment is fast and reversible; rewriting `main` is neither, and the release flow exists so that `main` only ever
moves forward through a PR. After the rollback, the fix or revert lands through `dev`, a release branch, and `main` like
any other change, so the branch reconverges with what is live. Recording the last-good deployment id before the release
is what makes the rollback a single command under incident pressure. A D1 migration is outside the rollback: a Worker
rollback leaves the schema as the release left it, so a schema change needs a forward path before the cut.

## Prose scrubbing scope

Three release-flow artifacts live outside any automated prose check and need a manual scrub before they ship:

- **PR bodies.** `gh pr create` and `gh pr edit` send body text directly to GitHub; no automated prose check has reach
  there.
- **`CHANGELOG.md`.** A generated artifact built from upstream PR bodies; it inherits whatever prose those PR bodies
  carry, so scrubbing happens at generation time on the release branch.
- **Release-PR bodies.** The `release/v<version>` PR to `main` carries contributor-authored wrap-up text composed after
  `CHANGELOG.md` has been generated, and the same out-of-repo gap applies.

Scrub-before-submit (author in `/tmp/`, scrub there, submit via `--body-file`) avoids the round-trip of "submit, scrub,
edit, scrub again". Every fix lands locally and the public PR sees only clean text.

For a `CHANGELOG.md` finding, fix the upstream PR body (which `generate-changelog.py` re-fetches every run) and
regenerate. Hand-editing `CHANGELOG.md` directly produces drift the next regeneration overwrites.

## Branch protection

### Status-check context strings

When a status check is made required in the `Protect main` ruleset, the context string MUST match exactly what GitHub
publishes for that check:

- **Inline job** (with `name:` field): published as just `<job-name>` (no workflow-name prefix).
- **Reusable-workflow caller** (`uses: .../foo.yml@ref`): published as `<caller-job-id> / <reusable-job-id-or-name>`.

Mixing these produces a stuck-but-green PR: all actual checks report green, but the ruleset waits forever on a context
that will never appear. The three guards here are reusable-workflow callers, so their contexts are `guard-docs /
check-forbidden-docs`, `guard-provenance / check-provenance`, and `guard-release / check-release-branch-name`. Confirm
the real contexts after a first run with:

```bash
gh api repos/brettdavies/cf_office_hours/commits/<sha>/check-runs --jq '.check_runs[].name'
```

### Why the rulesets are applied through the API

The two rulesets are managed with `gh api` and their JSON is not committed. A ruleset change is a repo-settings change
rather than a code change, so it does not need to ride the `dev` to `release/*` to `main` flow; inspecting the live
ruleset (`gh api repos/brettdavies/cf_office_hours/rulesets/<id>`) is the source of truth.

## Related docs

- [`RELEASES.md`](./RELEASES.md): operational runbook (commands, paths, decision tables).
- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut checklist gating the release-branch cut.
- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md): post-merge tag, deploy, and backport verification.
- [`.github/pull_request_template.md`](.github/pull_request_template.md): PR body structure with changelog sections.
