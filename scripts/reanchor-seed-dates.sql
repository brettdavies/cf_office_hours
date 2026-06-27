-- Re-anchor all seed timestamps onto the current date.
--
-- The seed data is generated relative to a fixed "now" (story 0.20: availability
-- and bookings are NOW + 1..21 days). Loaded as-is, that window is stuck in the
-- past. This script slides every timestamp by a single day-offset so the seed's
-- original "now" maps to today, preserving the whole distribution and every
-- relative ordering (created_at < meeting_start_time, the 3-week availability
-- spread, tier-override expiries, etc.).
--
-- The offset is computed once from MAX(bookings.created_at) (the seed's
-- generation moment) and frozen in a one-row table, so updating the timestamp
-- columns does not move the anchor mid-run. Nullable columns stay NULL
-- (julianday(NULL) is NULL). The script is idempotent: after it runs,
-- MAX(created_at) is today, so a re-run computes a ~0 offset and is a no-op.
--
-- Usage (run against a seeded D1):
--   cd apps/api && wrangler d1 execute <db-name> --env <env> --remote \
--     --file=../../scripts/reanchor-seed-dates.sql

DROP TABLE IF EXISTS _reanchor_shift;
CREATE TABLE _reanchor_shift AS
  SELECT (julianday('now') - julianday((SELECT MAX(created_at) FROM bookings))) AS d;

UPDATE users SET
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift)),
  deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(deleted_at) + (SELECT d FROM _reanchor_shift));

UPDATE portfolio_companies SET
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

UPDATE user_profiles SET
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

UPDATE user_urls SET
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

UPDATE taxonomy SET
  requested_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(requested_at) + (SELECT d FROM _reanchor_shift)),
  approved_at  = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(approved_at) + (SELECT d FROM _reanchor_shift)),
  created_at   = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

UPDATE entity_tags SET
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift)),
  deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(deleted_at) + (SELECT d FROM _reanchor_shift));

UPDATE availability SET
  start_time = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(start_time) + (SELECT d FROM _reanchor_shift)),
  end_time   = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(end_time) + (SELECT d FROM _reanchor_shift)),
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift)),
  deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(deleted_at) + (SELECT d FROM _reanchor_shift));

UPDATE time_slots SET
  start_time = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(start_time) + (SELECT d FROM _reanchor_shift)),
  end_time   = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(end_time) + (SELECT d FROM _reanchor_shift)),
  created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(deleted_at) + (SELECT d FROM _reanchor_shift));

UPDATE bookings SET
  meeting_start_time = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(meeting_start_time) + (SELECT d FROM _reanchor_shift)),
  meeting_end_time   = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(meeting_end_time) + (SELECT d FROM _reanchor_shift)),
  confirmed_at       = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(confirmed_at) + (SELECT d FROM _reanchor_shift)),
  created_at         = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at         = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift)),
  deleted_at         = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(deleted_at) + (SELECT d FROM _reanchor_shift));

UPDATE user_match_cache SET
  calculated_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(calculated_at) + (SELECT d FROM _reanchor_shift)),
  created_at    = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

UPDATE tier_override_requests SET
  expires_at  = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(expires_at) + (SELECT d FROM _reanchor_shift)),
  used_at     = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(used_at) + (SELECT d FROM _reanchor_shift)),
  reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(reviewed_at) + (SELECT d FROM _reanchor_shift)),
  created_at  = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (SELECT d FROM _reanchor_shift)),
  updated_at  = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(updated_at) + (SELECT d FROM _reanchor_shift));

DROP TABLE _reanchor_shift;

-- Phase 2: back-date meeting-request (booking) created_at within its liveness
-- window. A pending meeting request auto-rejects N days after creation
-- (N = 7 days, per the booking fixture "auto-rejected after 7 days"; the override
-- requests carry the same 7-day window). The seed stamps every booking's
-- created_at at the single seed-run instant, so the Phase 1 shift leaves them all
-- clustered at the anchor. Spreading created_at across [now - 7d, now] makes the
-- requests sit at realistic, varied points inside their live window. Override
-- requests already vary in the seed, so Phase 1 spreads them correctly and they
-- need no re-derivation here. 604800 = 7 * 86400 (seven days in seconds).
UPDATE bookings SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday('now') - (abs(random() % 604800)) / 86400.0);
UPDATE bookings SET updated_at = created_at;

-- Phase 3: confirmed meeting requests get a confirmed_at between their created_at
-- and now (a request is confirmed after it is created and before the present).
-- The seed leaves confirmed_at NULL even for status = 'confirmed' rows; pending
-- requests keep confirmed_at NULL. updated_at follows the confirmation, since
-- that is the row's most recent change.
UPDATE bookings
  SET confirmed_at = strftime('%Y-%m-%dT%H:%M:%fZ', julianday(created_at) + (abs(random() % 1000000) / 1000000.0) * (julianday('now') - julianday(created_at)))
  WHERE status = 'confirmed';
UPDATE bookings SET updated_at = confirmed_at WHERE status = 'confirmed' AND confirmed_at IS NOT NULL;
