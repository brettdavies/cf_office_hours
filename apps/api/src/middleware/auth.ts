// External dependencies
import type { Context, Next } from 'hono';

// Internal modules
import { createSupabaseClient } from '../lib/db';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

/**
 * Authentication middleware that verifies Supabase JWT tokens.
 *
 * Extracts the JWT token from the Authorization header, verifies it using
 * Supabase Auth, and injects the authenticated user into the request context.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 * @returns Response with 401 if auth fails, otherwise continues to next middleware
 *
 * @example
 * ```typescript
 * // Apply to specific route
 * app.get('/protected', requireAuth, (c) => {
 *   const user = c.get('user');
 *   return c.json({ user });
 * });
 *
 * // Apply to all routes in a group
 * app.use('/api/*', requireAuth);
 * ```
 */
export const requireAuth = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) => {
  // Extract token from Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const supabase = createSupabaseClient(c.env);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    // Check if user is whitelisted using email_whitelist view
    const userEmail = user.email;

    if (!userEmail) {
      console.warn('[AUTH] User has no email', {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. User email not found.',
            timestamp: new Date().toISOString(),
          },
        },
        403
      );
    }

    // Single query to check whitelist and get role
    const { data: whitelistEntry, error: whitelistError } = await supabase
      .from('email_whitelist')
      .select('email, role')
      .eq('email', userEmail)
      .limit(1)
      .maybeSingle();

    if (whitelistError || !whitelistEntry) {
      // User authenticated with Supabase but not whitelisted
      console.warn('[AUTH] User not whitelisted', {
        userId: user.id,
        email: userEmail,
        error: whitelistError?.message,
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. Your email is not registered in the system.',
            timestamp: new Date().toISOString(),
          },
        },
        403
      );
    }

    // Inject whitelisted user into context
    c.set('user', {
      id: user.id,
      email: whitelistEntry.email,
      role: whitelistEntry.role as 'mentee' | 'mentor' | 'coordinator',
    });

    return await next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
};
