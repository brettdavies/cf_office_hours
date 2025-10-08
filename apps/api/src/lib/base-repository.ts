/**
 * Base repository class providing common functionality for all repositories.
 *
 * This class handles the common pattern of creating a Supabase client instance
 * and provides shared utilities that all repositories need.
 */

// External dependencies
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import { createSupabaseClient } from "./db";

// Types
import type { Env } from "../types/bindings";

/**
 * Base class for all repository classes.
 *
 * Provides:
 * - Supabase client initialization
 * - Common database operations
 * - Error handling patterns
 */
export abstract class BaseRepository {
  /**
   * Supabase client instance for database operations.
   */
  protected supabase: SupabaseClient;

  /**
   * Initialize the repository with environment configuration.
   *
   * @param env - Cloudflare Workers environment with database credentials
   */
  constructor(env: Env) {
    this.supabase = createSupabaseClient(env);
  }

  /**
   * Execute a database query with error handling.
   * Useful for queries that don't need custom error handling.
   *
   * @param queryFn - Function that executes the database query
   * @returns Query result or throws formatted error
   */
  protected async executeQuery<T>(
    queryFn: (
      supabase: SupabaseClient,
    ) => Promise<{ data: T | null; error: any }>,
  ): Promise<T> {
    const { data, error } = await queryFn(this.supabase);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (data === null) {
      throw new Error("Query returned null data");
    }

    return data;
  }
}
