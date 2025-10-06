/**
 * API Routes Index
 *
 * Aggregates all API route modules.
 */

// External dependencies
import { OpenAPIHono } from '@hono/zod-openapi';

// Internal modules
import { userRoutes } from './users';
import { availabilityRoutes } from './availability';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Create main routes instance
export const routes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Mount route modules
routes.route('/users', userRoutes);
routes.route('/availability', availabilityRoutes);
