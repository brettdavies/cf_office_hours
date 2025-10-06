import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV) {
  console.log('[Supabase] Initializing client:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

if (import.meta.env.DEV) {
  console.log('[Supabase] Client created successfully with config:', {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  });
}
