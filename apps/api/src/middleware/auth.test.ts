// External dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Internal modules
import { requireAuth } from './auth';
import * as db from '../lib/db';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Mock Supabase client
vi.mock('../lib/db', () => ({
  createSupabaseClient: vi.fn(),
}));

describe('requireAuth middleware', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>;
  const mockEnv: Env = {
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SUPABASE_JWT_SECRET: 'test-jwt-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono<{ Bindings: Env; Variables: Variables }>();
    app.use('/protected', requireAuth);
    app.get('/protected', c => c.json({ message: 'success', user: c.get('user') }));
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await app.request('/protected', {}, { SUPABASE_URL: mockEnv.SUPABASE_URL } as Env);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
        timestamp: expect.any(String),
      },
    });
  });

  it('should return 401 when Authorization header is malformed', async () => {
    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'InvalidFormat' },
      },
      { SUPABASE_URL: mockEnv.SUPABASE_URL } as Env
    );
    const data = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
    expect(data.error.message).toContain('Missing or invalid Authorization header');
  });

  it('should return 401 when JWT token is invalid', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    };

    vi.mocked(db.createSupabaseClient).mockReturnValue(mockSupabase as any);

    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'Bearer invalid-token' },
      },
      mockEnv
    );
    const data = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
    expect(data.error.message).toContain('Invalid or expired token');
  });

  it('should return 403 when user is not whitelisted', async () => {
    const mockUser = {
      id: 'user-999',
      email: 'notwhitelisted@example.com',
      user_metadata: {},
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Not found in email_whitelist view
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(db.createSupabaseClient).mockReturnValue(mockSupabase as any);

    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'Bearer valid-token' },
      },
      mockEnv
    );
    const data = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
    expect(data.error.message).toContain('Access denied');
  });

  it('should inject user context when JWT token is valid and user is whitelisted', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'mentor@example.com',
      user_metadata: {},
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { email: 'mentor@example.com', role: 'mentor' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(db.createSupabaseClient).mockReturnValue(mockSupabase as any);

    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'Bearer valid-token' },
      },
      mockEnv
    );
    const data = (await res.json()) as {
      message: string;
      user: { id: string; email: string; role: string };
    };

    expect(res.status).toBe(200);
    expect(data.message).toBe('success');
    expect(data.user).toEqual({
      id: 'user-123',
      email: 'mentor@example.com',
      role: 'mentor',
    });
  });

  it('should set role to mentee if found in email_whitelist with mentee role', async () => {
    const mockUser = {
      id: 'user-456',
      email: 'mentee@example.com',
      user_metadata: {},
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { email: 'mentee@example.com', role: 'mentee' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(db.createSupabaseClient).mockReturnValue(mockSupabase as any);

    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'Bearer valid-token' },
      },
      mockEnv
    );
    const data = (await res.json()) as { user: { id: string; email: string; role: string } };

    expect(res.status).toBe(200);
    expect(data.user.role).toBe('mentee');
  });

  it('should return 500 when Supabase client throws error', async () => {
    vi.mocked(db.createSupabaseClient).mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const res = await app.request(
      '/protected',
      {
        headers: { Authorization: 'Bearer valid-token' },
      },
      mockEnv
    );
    const data = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toBe('Authentication failed');
  });
});
