// External dependencies
import { createClient } from '@supabase/supabase-js';

// Types
import type { Env } from '../types/bindings';

/**
 * Creates a Supabase client for server-side operations.
 *
 * Uses the service role key which bypasses Row Level Security (RLS) policies.
 * This is needed for server-side operations while JWT verification still
 * validates user identity.
 *
 * @param env - Cloudflare Workers environment bindings
 * @returns Configured Supabase client instance
 */
export const createSupabaseClient = (env: Env) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
