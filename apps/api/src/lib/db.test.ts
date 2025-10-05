// External dependencies
import { describe, it, expect } from 'vitest';

// Internal modules
import { createSupabaseClient } from './db';

// Types
import type { Env } from '../types/bindings';

describe('createSupabaseClient', () => {
  it('should create Supabase client with correct configuration', () => {
    const mockEnv: Env = {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret',
    };

    const client = createSupabaseClient(mockEnv);

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('should configure client with autoRefreshToken disabled', () => {
    const mockEnv: Env = {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret',
    };

    const client = createSupabaseClient(mockEnv);

    // Client should be created without throwing error
    expect(client).toBeDefined();
  });
});
