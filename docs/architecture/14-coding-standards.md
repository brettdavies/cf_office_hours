# 14. Coding Standards

These are the conventions the codebase follows; ESLint and Prettier (configured in `packages/config`) enforce the
mechanical ones.

## 14.1 Language and Types

- **TypeScript strict mode** everywhere. Prefer explicit types at module boundaries; avoid `any`.
- **Shared types are the single source of truth.** Request/response shapes and validation live in `packages/shared` (Zod
  schemas + inferred types) and are imported by both apps — never duplicated.
- The web app's API types are generated from the OpenAPI spec (`npm run generate:api-types`); do not hand-edit generated
  type files.

## 14.2 Backend Layering

The API enforces strict layering (see [8. Backend Architecture](./8-backend-architecture.md)):

- **Routes** validate input and shape responses; they never touch D1 directly.
- **Services** hold business logic, return plain typed objects, and never touch HTTP concerns (no `Context`, headers, or
  status codes). They signal failure by throwing `AppError`.
- **Repositories** are the only layer that runs SQL. They extend `BaseRepository` and use the D1 prepared-statement API
  (`prepare().bind().first()/all()/run()`), with multi-statement writes batched via `db.batch([...])` for atomicity.

## 14.3 Error Handling

Throw a single `AppError(statusCode, message, code, details?)` from services; let it propagate to the global handler,
which renders the shared error envelope. Do not format error responses in route handlers. See
[15. Error Handling Strategy](./15-error-handling-strategy.md).

## 14.4 D1 Conventions

SQLite stores everything as a few affinities, so use the helpers in `lib/d1-utils.ts` rather than ad-hoc conversions:
`nowIso` / `newId` for timestamps and ids, `toInt` / `toBool` for the `0`/`1` boolean columns, and `parseJson` /
`stringifyJson` for text-encoded JSON. Maintain `updated_at` explicitly in app code; D1 has no triggers.

## 14.5 Naming and Structure

- Files are kebab-case with a role suffix where it aids scanning (`*.service.ts`, `*.repository.ts`, `*.engine.ts`).
- Keep modules focused on one responsibility; co-locate tests under `src/test/`.
- Imports are grouped external → internal → types.

## 14.6 Comments

Comment the non-obvious *why* (constraints, invariants, deliberate trade-offs), not the *what*. Avoid narrating change
history in code; the git log holds that.
