// External dependencies
import * as jose from 'jose';

// Types
import type { Env } from '../types/bindings';

/**
 * Supabase JWT claims structure
 */
export interface SupabaseJWTClaims {
  sub: string; // User ID
  email?: string;
  phone?: string;
  role: string;
  aal?: string;
  session_id?: string;
  is_anonymous?: boolean;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

/**
 * Verifies a Supabase JWT token using the JWT secret.
 *
 * This function verifies the JWT locally without making a network request to Supabase,
 * making it faster and more reliable for authentication checks.
 *
 * @param token - The JWT token to verify
 * @param env - Cloudflare Workers environment bindings
 * @returns The decoded and verified JWT claims
 * @throws {Error} If the token is invalid, expired, or verification fails
 *
 * @example
 * ```typescript
 * try {
 *   const claims = await verifySupabaseJWT(token, c.env);
 *   console.log('User ID:', claims.sub);
 * } catch (error) {
 *   console.error('Invalid token:', error);
 * }
 * ```
 */
export async function verifySupabaseJWT(
  token: string,
  env: Env
): Promise<SupabaseJWTClaims> {
  try {
    // Convert the JWT secret to Uint8Array for jose
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

    // Verify the JWT and extract claims
    // jose will automatically check:
    // - Signature validity
    // - Expiration (exp claim)
    // - Not before (nbf claim)
    const { payload } = await jose.jwtVerify(token, secret, {
      // Optionally verify the issuer matches your Supabase project
      // issuer: env.SUPABASE_URL + '/auth/v1',
      // Optionally verify the audience
      // audience: 'authenticated',
    });

    return payload as SupabaseJWTClaims;
  } catch (error) {
    // jose throws JWTExpired, JWTInvalid, etc.
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed');
  }
}
