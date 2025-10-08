import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing client:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
});

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
    storage: window.localStorage,
    storageKey: 'sb-auth-token',
  },
});

console.log('[Supabase] Client created successfully with config:', {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
  storageKey: 'sb-auth-token',
});

// Test localStorage availability
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('[Supabase] localStorage is available');
} catch (e) {
  console.error('[Supabase] localStorage is NOT available:', e);
}
