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

Returns the API health status. No authentication required.

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

### Protected Route (Test Endpoint)

**GET /protected**

Test endpoint that requires authentication. Returns authenticated user information.

**Headers:**

- `Authorization: Bearer <jwt_token>` (required)

**Response (200 OK):**

```json
{
  "message": "Authenticated",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "mentee"
  }
}
```

**Response (401 Unauthorized):**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header",
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

**Example:**

```bash
# Without token (will fail)
curl http://localhost:8787/protected

# With valid token
curl -H "Authorization: Bearer <your-jwt-token>" http://localhost:8787/protected
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

### Local Development Setup

The API now requires Supabase for authentication. Follow these steps:

**1. Start Local Supabase:**

```bash
npx supabase start
```

This will output the credentials you need, including:

- API URL (typically `http://localhost:54321`)
- Service role key
- JWT secret

**2. Configure Environment Variables:**

Copy the example file:

```bash
cd apps/api
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your local Supabase credentials:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-start
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-start
```

**3. Obtain a JWT Token for Testing:**

Option 1: Use Supabase Studio (http://localhost:54323)

- Create a test user via Authentication UI
- Sign in to get a JWT token

Option 2: Use the Supabase CLI:

```bash
# Create a user
npx supabase db seed

# Or use Supabase client to generate token programmatically
```

**Environment Variables Reference:**

| Variable                    | Location        | Description                               |
| --------------------------- | --------------- | ----------------------------------------- |
| `SUPABASE_URL`              | `wrangler.toml` | Local Supabase API URL (committed)        |
| `SUPABASE_SERVICE_ROLE_KEY` | `.dev.vars`     | Service role key (NOT committed)          |
| `SUPABASE_JWT_SECRET`       | `.dev.vars`     | JWT secret for validation (NOT committed) |

**Note:** The `.dev.vars` file is gitignored and should never be committed.

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts                    # Main Hono app entry point
│   ├── middleware/
│   │   ├── error-handler.ts        # Global error handling
│   │   └── auth.ts                 # Authentication middleware
│   ├── lib/
│   │   └── db.ts                   # Supabase client utility
│   └── types/
│       ├── bindings.ts             # Cloudflare Workers bindings types
│       └── context.ts              # Hono context variables types
├── wrangler.toml                   # Cloudflare Workers configuration
├── .dev.vars.example               # Environment variables template
├── package.json
└── README.md                       # This file
```

## Middleware

The API includes the following middleware:

### Global Middleware (applied to all routes)

- **Logger** (`hono/logger`) - Request/response logging
- **CORS** (`hono/cors`) - Cross-origin resource sharing
  - Allowed origins: `http://localhost:3000`, `https://officehours.youcanjustdothings.io`
  - Credentials: enabled
- **Pretty JSON** (`hono/pretty-json`) - Formatted JSON responses

### Authentication Middleware

- **requireAuth** (`src/middleware/auth.ts`) - JWT token verification
  - Verifies Supabase JWT tokens from Authorization header
  - Injects user context into request: `c.get('user')`
  - Returns 401 for missing/invalid tokens
  - Applied to protected routes only

**Usage Example:**

```typescript
import { requireAuth } from './middleware/auth';

// Apply to specific route
app.get('/protected', requireAuth, c => {
  const user = c.get('user');
  return c.json({ user });
});

// Apply to route group
app.use('/api/*', requireAuth);
```

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
- `UNAUTHORIZED` (401) - Missing or invalid authentication
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
