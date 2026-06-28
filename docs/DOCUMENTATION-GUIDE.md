# Documentation Guide

A map of the project's documentation: what each piece is for and where it lives. The guiding rule is single source of
truth — each topic has one authoritative home, and other docs link to it rather than restating it.

## Live Documentation

| Topic                            | Location                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Project overview and quick start | [`README.md`](../README.md)                                                                       |
| One-page project summary         | [`PROJECT.md`](../PROJECT.md)                                                                     |
| API setup, auth, endpoints       | [`apps/api/README.md`](../apps/api/README.md)                                                     |
| Web setup and auth flow          | [`apps/web/README.md`](../apps/web/README.md)                                                     |
| Architecture (sharded)           | [`docs/architecture/index.md`](architecture/index.md)                                             |
| Matching system deep-dive        | [`docs/architecture/matching-cache-architecture.md`](architecture/matching-cache-architecture.md) |
| Matching engine authoring        | [`apps/api/src/providers/matching/README.md`](../apps/api/src/providers/matching/README.md)       |
| Deploy runbook                   | [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](deployment/DEPLOYMENT_INSTRUCTIONS.md)             |
| Production launch checklist      | [`docs/deployment/production-launch-checklist.md`](deployment/production-launch-checklist.md)     |
| Troubleshooting                  | [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md)                                                   |
| Seed data generation             | [`apps/api/seeds/README.md`](../apps/api/seeds/README.md)                                         |

## Architecture Sections

The architecture document is sharded under [`docs/architecture/`](architecture/) and indexed by
[`index.md`](architecture/index.md). Sections cover the high-level design, tech stack, data model, API surface, frontend
and backend internals, project structure, deployment, security, testing, coding standards, error handling, and
observability.

## Historical Record

The early product requirements, implementation stories, and QA gates are preserved unedited under
[`docs/archive/`](archive/) as a frozen snapshot of the original planning process. They describe earlier design intent —
including tooling the platform no longer uses — and are not maintained. Start from the live docs above for current
reality.

## Principles

- **Single source of truth.** Each topic lives in one place; link to it instead of copying.
- **Present state.** Live docs describe the system as it is now. Change history belongs in git and the `CHANGELOG`.
- **Right depth.** `README` stays high-level; architecture shards go deep; troubleshooting is symptom → fix.

## Quick Reference

| Need to…                        | Read                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| Get started quickly             | [`README.md`](../README.md)                                      |
| Run the API locally             | [`apps/api/README.md`](../apps/api/README.md)                    |
| Run the web app locally         | [`apps/web/README.md`](../apps/web/README.md)                    |
| Understand the data model       | [Data Models](architecture/4-data-models.md)                     |
| Deploy to staging or production | [Deployment Instructions](deployment/DEPLOYMENT_INSTRUCTIONS.md) |
| Fix a local issue               | [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)                       |
