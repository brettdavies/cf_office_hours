export interface Env {
  // Cloudflare D1 database binding
  DB: D1Database;

  // HMAC secret used to sign and verify session JWTs (wrangler secret)
  JWT_SECRET: string;

  // OpenAI API key for the AI-based matching engine (optional)
  OPENAI_API_KEY?: string;

  // Email provider (Resend) key and sender; emails log to console when unset
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;

  // Deployment environment name (development | production)
  ENVIRONMENT?: string;

  // Dashboard base URL for links in notification emails
  DASHBOARD_URL?: string;

  // KV Namespaces (optional)
  CACHE?: KVNamespace;
  RATE_LIMIT?: KVNamespace;
}
