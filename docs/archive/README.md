# Archived documentation

> [!WARNING]
> Historical record — frozen snapshot of the pre-Cloudflare BMAD planning process. Not maintained; may reference retired
> tooling (Supabase, Cloudflare Pages, an Airtable sync, OAuth/magic-link auth, and similar). It does **not** describe the
> running system. For current reality, see [`docs/architecture/`](../architecture/) and the live `README.md`,
> `apps/api/README.md`, `apps/web/README.md`, and `docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`.

This subfolder preserves the planning and process artifacts that drove the project's early development. They are kept
verbatim as a point-in-time snapshot: their bodies are intentionally left unedited, including descriptions of stacks and
integrations the platform no longer uses.

## What lives here

- **`prd/`** — the BMAD technical product requirements document (sharded), including its `change-log.md` change record.
- **`stories/`** — the per-feature implementation stories (`0.0`–`0.32`).
- **`qa/`** — the manual test checklist and the `gates/` quality-gate YAML files.
- **`deployment-logs/`** — the append-only `api-deployment-log.md` and `frontend-deployment-log.md` deploy records.
- **`auth-fix-summary.md`** — a dated write-up of an authentication bug fix against the earlier stack.
- **`sprint-change-proposal-2025-10-06.md`** — a dated sprint-change proposal.

## Links inside the archive

Cross-links between these files are preserved as originally authored. Some point at other archived files; some point at
paths that have since moved. Broken links **within this archive are expected** and are not maintained — only links in
the live documentation outside `docs/archive/` are kept resolving.
