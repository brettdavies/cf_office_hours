// External dependencies
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Internal modules
import { requireAuth } from './auth';
import { signJwt } from '../lib/jwt';
import { createTestDb, insertRow } from '../test/helpers/d1';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

const JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters-long';

function makeEnv(): { env: Env; raw: ReturnType<typeof createTestDb>['raw'] } {
  const { DB, raw } = createTestDb();
  return { env: { DB, JWT_SECRET } as unknown as Env, raw };
}

function seedUser(raw: ReturnType<typeof createTestDb>['raw'], email: string, role: string): void {
  insertRow(raw, 'users', {
    id: `id-${email}`,
    airtable_record_id: `air-${email}`,
    email,
    role,
  });
}

describe('requireAuth middleware', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>;

  beforeEach(() => {
    app = new Hono<{ Bindings: Env; Variables: Variables }>();
    app.use('/protected', requireAuth);
    app.get('/protected', c => c.json({ message: 'success', user: c.get('user') }));
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { env } = makeEnv();
    const res = await app.request('/protected', {}, env);
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header is malformed', async () => {
    const { env } = makeEnv();
    const res = await app.request(
      '/protected',
      { headers: { Authorization: 'InvalidFormat' } },
      env
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when the JWT is invalid', async () => {
    const { env } = makeEnv();
    const res = await app.request(
      '/protected',
      { headers: { Authorization: 'Bearer not-a-real-token' } },
      env
    );
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when the user is not on the allowlist', async () => {
    const { env } = makeEnv();
    const token = await signJwt(
      { sub: 'user-999', email: 'notallowed@example.com', role: 'mentee' },
      env
    );
    const res = await app.request(
      '/protected',
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('injects the user when the token is valid and allowlisted', async () => {
    const { env, raw } = makeEnv();
    seedUser(raw, 'mentor@example.com', 'mentor');
    const token = await signJwt(
      { sub: 'user-123', email: 'mentor@example.com', role: 'mentor' },
      env
    );
    const res = await app.request(
      '/protected',
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { id: string; email: string; role: string } };
    expect(data.user).toEqual({
      id: 'user-123',
      email: 'mentor@example.com',
      role: 'mentor',
    });
  });

  it('uses the role from the allowlist (mentee)', async () => {
    const { env, raw } = makeEnv();
    seedUser(raw, 'mentee@example.com', 'mentee');
    const token = await signJwt(
      { sub: 'user-456', email: 'mentee@example.com', role: 'mentee' },
      env
    );
    const res = await app.request(
      '/protected',
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { role: string } };
    expect(data.user.role).toBe('mentee');
  });

  it('returns 500 when the database binding is unavailable', async () => {
    const env = { JWT_SECRET } as unknown as Env;
    const token = await signJwt(
      { sub: 'user-789', email: 'error@example.com', role: 'mentee' },
      env
    );
    const res = await app.request(
      '/protected',
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
