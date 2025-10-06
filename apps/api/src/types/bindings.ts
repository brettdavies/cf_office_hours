export interface Env {
  // Environment variables (from wrangler.toml or secrets)
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  DASHBOARD_URL?: string; // Optional, defaults to production URL

  // KV Namespaces (optional for Epic 0, used in Epic 1)
  CACHE?: KVNamespace;
  RATE_LIMIT?: KVNamespace;
}
