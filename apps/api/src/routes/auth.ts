/**
 * Auth API Routes
 *
 * Demo authentication for a non-sensitive OSS demo: no signup, no allowlist. The
 * client picks a role ("login as Mentee/Mentor/Coordinator") and the API starts a
 * session as a random existing user of that role, returning a Worker-signed JWT.
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

const DemoLoginRequestSchema = z.object({
  role: z.enum(['mentee', 'mentor', 'coordinator']),
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

const demoLoginRoute = createRoute({
  method: 'post',
  path: '/demo-login',
  tags: ['Auth'],
  summary: 'Start a demo session as a random user of the given role',
  description:
    'Demo login for the OSS demo. Returns a signed session JWT for a randomly ' +
    'chosen existing user with the requested role.',
  request: {
    body: {
      content: {
        'application/json': { schema: DemoLoginRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Session token and user identity',
      content: { 'application/json': { schema: LoginResponseSchema } },
    },
    404: {
      description: 'No user exists for the requested role',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

authRoutes.openapi(demoLoginRoute, async c => {
  const { role } = c.req.valid('json');
  const db = getDb(c.env);

  const user = await db
    .prepare(
      `SELECT id, email, role FROM users
       WHERE role = ? AND deleted_at IS NULL
       ORDER BY RANDOM() LIMIT 1`
    )
    .bind(role)
    .first<{ id: string; email: string; role: 'mentee' | 'mentor' | 'coordinator' }>();

  if (!user) {
    return c.json(
      {
        error: {
          code: 'NO_USER',
          message: `No ${role} accounts are available in the demo.`,
          timestamp: new Date().toISOString(),
        },
      },
      404
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
