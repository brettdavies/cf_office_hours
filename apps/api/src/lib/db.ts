// Types
import type { Env } from '../types/bindings';

/**
 * Returns the Cloudflare D1 database binding.
 *
 * Server-side queries run with full access; authorization is enforced in the
 * auth middleware and service layer rather than at the database.
 *
 * @param env - Cloudflare Workers environment bindings
 * @returns The D1 database handle
 * @throws If the `DB` binding is not configured (fail fast at first use)
 */
export const getDb = (env: Env): D1Database => {
  if (!env.DB) {
    throw new Error('D1 database binding "DB" is not configured');
  }
  return env.DB;
};
