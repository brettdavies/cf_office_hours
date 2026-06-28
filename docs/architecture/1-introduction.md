# 1. Introduction

This is the fullstack architecture documentation for the **CF Office Hours Platform** — an intelligent mentor-mentee
matching and scheduling application for a startup accelerator program. It describes the system as built: a Cloudflare
Workers backend on Cloudflare D1, a React single-page app served as Workers static assets, and the shared types and
matching logic that connect them.

The document is sharded into numbered sections (this file plus `2-*.md` through `16-*.md`). Read them in order for a
top-to-bottom tour, or jump via [`index.md`](./index.md).

## 1.1 How to read this document

- **Architecture (this tree).** Sections 2–16 cover the high-level design, tech stack, data model, API surface, frontend
  and backend internals, project structure, deployment, security, testing, coding standards, error handling, and
  observability.
- **Setup and operations (live runbooks).** Day-to-day setup, run, and deploy steps live with the code and are the
  authoritative source for commands: [`apps/api/README.md`](../../apps/api/README.md),
  [`apps/web/README.md`](../../apps/web/README.md), and
  [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](../deployment/DEPLOYMENT_INSTRUCTIONS.md).
- **Troubleshooting.** Common local issues and fixes live in [`docs/TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).
- **Historical planning record.** The original product requirements, implementation stories, and QA gates are preserved
  unedited under [`docs/archive/`](../archive/) as a frozen snapshot of the early process. They describe earlier design
  intent and do not reflect the current implementation.
