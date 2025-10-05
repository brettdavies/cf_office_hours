/**
 * Supabase Test Client
 *
 * Provides a configured Supabase client for integration tests.
 * Connects to local Supabase instance (localhost:54321).
 *
 * Configuration via .env file (see .env.example):
 * - SUPABASE_URL: Local Supabase instance URL
 * - SUPABASE_ANON_KEY: Local Supabase anon key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing environment variables. Copy .env.example to .env and configure SUPABASE_URL and SUPABASE_ANON_KEY'
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to clean up test data after tests
 */
export async function cleanupTestData(tables: string[]) {
  for (const table of tables.reverse()) {
    // Reverse order to handle FK dependencies
    await supabase.from(table).delete().neq(
      "id",
      "00000000-0000-0000-0000-000000000000",
    );
  }
}
