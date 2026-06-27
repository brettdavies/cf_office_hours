// External dependencies
import * as jose from 'jose';

// Types
import type { Env } from '../types/bindings';

/** Session JWT claims issued and verified by the Worker. */
export interface JwtClaims {
  sub: string; // User ID (D1 users.id)
  email: string;
  role: 'mentee' | 'mentor' | 'coordinator';
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

const ALG = 'HS256';
const ISSUER = 'cf-office-hours';
const AUDIENCE = 'authenticated';
const DEFAULT_TTL = '12h';

const secretKey = (env: Env): Uint8Array => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(env.JWT_SECRET);
};

/**
 * Signs a session JWT for an authenticated user.
 *
 * @param claims - User identity to embed (sub, email, role)
 * @param env - Cloudflare Workers environment bindings
 * @param ttl - Token lifetime (jose duration string, default 12h)
 * @returns Signed compact JWT
 */
export async function signJwt(
  claims: Pick<JwtClaims, 'sub' | 'email' | 'role'>,
  env: Env,
  ttl: string = DEFAULT_TTL
): Promise<string> {
  return new jose.SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secretKey(env));
}

/**
 * Verifies a session JWT locally and returns its claims.
 *
 * @param token - The JWT to verify
 * @param env - Cloudflare Workers environment bindings
 * @returns The decoded and verified claims
 * @throws If the token is invalid, expired, or verification fails
 */
export async function verifyJwt(token: string, env: Env): Promise<JwtClaims> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey(env), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as unknown as JwtClaims;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed');
  }
}
