# CF Office Hours API

Hono-based REST API for the Capital Factory Office Hours platform, running on Cloudflare Workers.

## Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- No Cloudflare account required for local development

### Local Development

```bash
# Install dependencies (from project root)
npm install

# Start local development server
cd apps/api
npm run dev
```

The API will be available at `http://localhost:8787`

### Hot Reload

The local server automatically reloads when you make changes to the code. No restart needed!

## Available Endpoints

### Health Check

**GET /health**

Returns the API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T12:34:56.789Z"
}
```

**Example:**
```bash
curl http://localhost:8787/health
```

### 404 Not Found

Any non-existent route returns a structured error response.

**Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found",
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

**Example:**
```bash
curl http://localhost:8787/nonexistent
```

## Testing

### Run Tests

```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
```

### Test Endpoints Locally

```bash
# Health check
curl http://localhost:8787/health

# Test CORS headers
curl -I -H "Origin: http://localhost:3000" http://localhost:8787/health

# Test 404 handling
curl http://localhost:8787/invalid
```

## Environment Variables

### Epic 0 (Current)

No environment variables are required for local development in Epic 0.

### Future (Epic 1+)

The following environment variables will be used:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_JWT_SECRET` - JWT secret for token validation

These will be configured in Cloudflare Workers settings during deployment.

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts                    # Main Hono app entry point
│   ├── middleware/
│   │   └── error-handler.ts        # Global error handling
│   └── types/
│       └── bindings.ts             # Cloudflare Workers bindings types
├── wrangler.toml                   # Cloudflare Workers configuration
├── package.json
└── README.md                       # This file
```

## Middleware

The API includes the following global middleware:

- **Logger** (`hono/logger`) - Request/response logging
- **CORS** (`hono/cors`) - Cross-origin resource sharing
  - Allowed origins: `http://localhost:3000`, `https://officehours.youcanjustdothings.io`
  - Credentials: enabled
- **Pretty JSON** (`hono/pretty-json`) - Formatted JSON responses

## Error Handling

All errors return JSON responses with the following structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

Common error codes:
- `NOT_FOUND` (404) - Resource not found
- `INTERNAL_ERROR` (500) - Server error

## Deployment

### Local Development (Current)

The API runs locally via Wrangler dev server. No deployment or Cloudflare account required.

### Production Deployment (Future Story)

Production deployment will be handled in a separate story and will require:
- Cloudflare account setup
- `wrangler login` authentication
- Environment variable configuration
- Custom domain setup (optional)

**Deployment commands (future):**
```bash
npm run deploy              # Deploy to production
npm run deploy:staging      # Deploy to staging environment
```

## Development Workflow

1. Make code changes in `src/`
2. Changes auto-reload in local server
3. Test endpoints with curl or browser
4. Run tests: `npm test`
5. Commit when all tests pass

## Technology Stack

- **Framework:** Hono 4.x
- **Runtime:** Cloudflare Workers (Node.js compatibility mode)
- **Testing:** Vitest 3.x
- **TypeScript:** 5.7.x

## Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
