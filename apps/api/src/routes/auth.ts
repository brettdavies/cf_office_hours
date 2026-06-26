/**
 * Auth API Routes
 *
 * Demo authentication: a fixed allowlist of hardcoded users, no signup. A POST
 * with an allowlisted email returns a Worker-signed session JWT. The email must
 * already exist in the users table (the allowlist); unknown emails are rejected.
 */

// External dependencies
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

// Internal modules
import { getDb } from '../lib/db';
import { signJwt } from '../lib/jwt';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

export const authRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

const LoginRequestSchema = z.object({
  email: z.string().email(),
});

const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(['mentee', 'mentor', 'coordinator']),
  }),
});

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string(),
  }),
});

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Exchange an allowlisted email for a session token',
  description:
    'Demo passwordless login. Returns a signed session JWT when the email belongs ' +
    'to a known user. No account is created for unknown emails.',
  request: {
    body: {
      content: {
        'application/json': { schema: LoginRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Session token and user identity',
      content: { 'application/json': { schema: LoginResponseSchema } },
    },
    403: {
      description: 'Email is not on the allowlist',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

authRoutes.openapi(loginRoute, async c => {
  const { email } = c.req.valid('json');
  const db = getDb(c.env);

  const user = await db
    .prepare('SELECT id, email, role FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1')
    .bind(email)
    .first<{ id: string; email: string; role: 'mentee' | 'mentor' | 'coordinator' }>();

  if (!user) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'This email is not registered for the demo.',
          timestamp: new Date().toISOString(),
        },
      },
      403
    );
  }

  const access_token = await signJwt({ sub: user.id, email: user.email, role: user.role }, c.env);

  return c.json(
    {
      access_token,
      token_type: 'bearer' as const,
      user: { id: user.id, email: user.email, role: user.role },
    },
    200
  );
});
