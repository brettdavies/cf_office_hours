/**
 * Match-cache population entry point.
 *
 * Cache rows ship in the D1 seed (migrated from the production backup), so this
 * standalone script no longer populates the cache directly: a D1 database is only
 * reachable from the Worker runtime, not a plain Node process. To recompute
 * matches, invoke the tag-based engine from inside the Worker (e.g. a
 * coordinator-only admin route) where the `DB` binding is available.
 */

console.log(
  '[MATCHING] Match-cache population runs inside the Worker against the D1 binding. ' +
    'Seed data already includes cached matches; recompute via the API rather than this script.'
);
