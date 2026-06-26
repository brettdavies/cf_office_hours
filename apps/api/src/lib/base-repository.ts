// Internal modules
import { getDb } from './db';

// Types
import type { Env } from '../types/bindings';

/**
 * Base class for all repository classes.
 *
 * Holds the D1 database handle used for prepared-statement queries.
 */
export abstract class BaseRepository {
  /**
   * D1 database handle for query execution.
   */
  protected db: D1Database;

  /**
   * Initialize the repository with environment configuration.
   *
   * @param env - Cloudflare Workers environment with the D1 binding
   */
  constructor(env: Env) {
    this.db = getDb(env);
  }
}
