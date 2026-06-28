# 4. Data Models

The schema lives in `apps/api/migrations/0001_initial_schema.sql` and is applied with `wrangler d1 migrations apply`.
That migration is the source of truth; this section summarizes it. The corresponding TypeScript types and Zod schemas
live in `packages/shared`.

## 4.1 Conventions

D1 is SQLite, so the schema leans on SQLite type affinities:

- **Identifiers** are `TEXT` UUIDs. The app generates them (`crypto.randomUUID`); a column default provides a fallback.
- **Timestamps and dates** are `TEXT` in ISO-8601 UTC.
- **Booleans** are `INTEGER` (`0`/`1`); **JSON** is stored as `TEXT`.
- Most tables carry an **audit trail** (`created_at` / `created_by` / `updated_at` / `updated_by`) and a **soft-delete**
  pair (`deleted_at` / `deleted_by`). `time_slots` is the exception — it has `created_at` but no `updated_at`.
- **Referential integrity and authorization are enforced in the application layer.** D1 does not run row-level security,
  triggers, or stored procedures; `updated_at` is maintained explicitly in app code.

The schema defines **eleven tables** and **two read views**.

## 4.2 `users`

The account record for every mentee, mentor, and coordinator.

| Column               | Type / Constraint                                           | Notes                                 |
| -------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `id`                 | `TEXT` PK                                                   | UUID                                  |
| `airtable_record_id` | `TEXT UNIQUE NOT NULL`                                      | Opaque external record id (see below) |
| `email`              | `TEXT UNIQUE NOT NULL`                                      | Login identity for demo login         |
| `role`               | `TEXT CHECK (role IN ('mentee','mentor','coordinator'))`    | Drives authorization                  |
| `reputation_tier`    | `TEXT CHECK (... IN ('bronze','silver','gold','platinum'))` | Optional access tier                  |

`airtable_record_id` is an **opaque external record identifier carried in the schema** — it labels the row's origin in
the data set the demo was seeded from. It is `UNIQUE NOT NULL` and indexed, so it is load-bearing for seed loading and
is read by `user.repository.ts` and `matching.service.ts`, but there is **no live Airtable integration**: no Airtable
API client, no webhook, no sync job, and no Airtable secrets exist anywhere in the codebase.

## 4.3 `portfolio_companies`, `user_profiles`, `user_urls`

- **`portfolio_companies`** — startup records (`name` unique, plus `description`, `website`, `stage`,
  `customer_segment`, `product_type`, `sales_model`, and similar descriptive columns).
- **`user_profiles`** — one-to-one with `users` (`user_id UNIQUE`). Holds display fields (`name`, `title`, `company`,
  `bio`, avatar metadata, reminder preference) and the mentor matching inputs `expertise_description` and
  `ideal_mentee_description`. Optionally links to a `portfolio_companies` row.
- **`user_urls`** — external links per user, typed by `url_type` (`website` / `pitch_vc` / `linkedin` / `other`), unique
  per `(user_id, url_type)`.

## 4.4 `taxonomy` and `entity_tags`

The tagging system that feeds tag-based matching.

- **`taxonomy`** — the controlled vocabulary. Each term has a `category` (`industry` / `technology` / `stage`), a
  `value`, a `display_name`, an optional `parent_id`, and an approval flag. `source` is a `CHECK`-constrained
  **provenance enum** — `'airtable'` / `'user'` / `'auto_generated'` / `'admin'` / `'sample_data'` — recording where a
  term came from; `'airtable'` is one allowed provenance value, not a live integration. `taxonomy` also carries an
  optional `airtable_record_id` for the same seed-origin reason as `users`.
- **`entity_tags`** — the join table linking a `taxonomy` term to an entity (`user` or `portfolio_company`). A partial
  unique index keeps one active tag per `(entity_type, entity_id, taxonomy_id)` while supporting soft-delete.

## 4.5 `availability`, `time_slots`, `bookings`

The scheduling core.

- **`availability`** — a mentor's bookable block (`mentor_id`, `start_time`, `end_time`, `slot_duration_minutes` in
  `{15,20,30,60}`, `location`).
- **`time_slots`** — concrete slots generated from an availability block (`availability_id`, `mentor_id`, `start_time`,
  `end_time`, `is_booked`, `booking_id`). Generated synchronously when the block is created.
- **`bookings`** — a confirmed meeting between a `mentor_id` and `mentee_id` for one `time_slot_id` (`UNIQUE`, the guard
  against double-booking). Carries `meeting_goal`, `location`, `status`
  (`pending`/`confirmed`/`completed`/`canceled`/`expired`), confirmation fields, and the meeting time range.

## 4.6 `user_match_cache`

Precomputed recommendations. Each row is a directed `(user_id → recommended_user_id)` pair with a `match_score` (`REAL`,
0–100), a `match_explanation` (`TEXT`), and the `algorithm_version` that produced it. Unique on `(user_id,
recommended_user_id, algorithm_version)` so multiple algorithms coexist, with a `CHECK` preventing self-matches. Indexed
for fast per-user, score-ordered reads. This table is the read path for recommendations; see
[8.6 Matching Providers and Events](./8-backend-architecture.md#86-matching-providers-and-events) and
[matching-cache-architecture.md](./matching-cache-architecture.md).

## 4.7 `tier_override_requests`

A mentee's request to book a mentor above their reputation tier (`mentee_id`, `mentor_id`, `reason`, `status`, `scope` =
`one_time`, `expires_at`, review fields). Expiry is evaluated at read time, not by a scheduled job.

## 4.8 Read Views

- **`algorithm_versions`** — the distinct `algorithm_version` values present in `user_match_cache`.
- **`distinct_users_with_scores`** — the flattened set of users appearing in the cache as either side of a pair.

## 4.9 Relationships

```text
users 1──1 user_profiles
users 1──* user_urls
users 1──* availability 1──* time_slots
users (mentor) 1──* bookings *──1 users (mentee)
bookings 1──1 time_slots
portfolio_companies 1──* user_profiles
taxonomy 1──* entity_tags *──1 (users | portfolio_companies)
users 1──* user_match_cache *──1 users
users 1──* tier_override_requests *──1 users (mentor)
```
