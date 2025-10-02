# 12. Security and Performance

This section covers comprehensive security best practices, authentication implementation details, data protection strategies, and performance optimization techniques for the CF Office Hours platform.

## 12.1 Security Architecture Overview

**Defense in Depth Strategy:**
- Multiple layers of security controls
- Principle of least privilege
- Fail-safe defaults
- Security by design

**Key Security Domains:**
1. Authentication & Authorization
2. Data Protection
3. API Security
4. Frontend Security
5. Infrastructure Security
6. Compliance & Privacy

## 12.2 Authentication & Authorization

**Authentication Flow (Supabase Auth):**

```typescript
// apps/web/src/lib/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Magic link authentication
export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) throw error;
}

// OAuth authentication (Google/Microsoft)
export async function signInWithOAuth(provider: 'google' | 'azure') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: provider === 'google' 
        ? 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
        : 'openid email profile Calendars.ReadWrite',
    },
  });
  
  if (error) throw error;
}
```

**JWT Token Management:**

```typescript
// apps/api/src/middleware/auth.ts
import { verify } from '@tsndr/cloudflare-worker-jwt';

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const isValid = await verify(token, secret);
  
  if (!isValid) {
    throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  
  // Check token expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new AppError(401, 'Token expired', 'TOKEN_EXPIRED');
  }
  
  return payload;
}

// Auth middleware
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing authentication token', 'UNAUTHORIZED');
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.SUPABASE_JWT_SECRET);
  
  // Fetch user from database
  const user = await c.env.db
    .from('users')
    .select('*')
    .eq('id', payload.sub)
    .is('deleted_at', null)
    .single();
  
  if (!user) {
    throw new AppError(401, 'User not found', 'USER_NOT_FOUND');
  }
  
  c.set('user', user);
  await next();
};
```

**Role-Based Access Control (RBAC):**

```typescript
// apps/api/src/middleware/rbac.ts
export const requireRole = (...allowedRoles: Role[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    
    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    
    await next();
  };
};

// Usage in routes
app.get('/api/admin/users', 
  requireAuth, 
  requireRole('coordinator'),
  async (c) => {
    // Only coordinators can access
  }
);
```

**Row Level Security (RLS) Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Coordinators can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

-- Bookings table policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

CREATE POLICY "Mentees can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    mentee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('mentee', 'mentor')
    )
  );

-- Ratings table policies
CREATE POLICY "Users can view ratings they gave or received"
  ON ratings FOR SELECT
  TO authenticated
  USING (
    rater_id = auth.uid() 
    OR rated_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

CREATE POLICY "Users can create ratings for their bookings"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = NEW.booking_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      AND status = 'completed'
    )
  );
```

## 12.3 Data Protection

**Encryption at Rest:**
- **Database:** Supabase provides automatic encryption at rest (AES-256)
- **Storage:** Supabase Storage encrypts all objects
- **Sensitive Fields:** Additional application-level encryption for PII

**Sensitive Data Handling:**

```typescript
// apps/api/src/utils/encryption.ts
import { createHash, randomBytes } from 'crypto';

// Hash sensitive identifiers (one-way)
export function hashIdentifier(value: string): string {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

// Generate secure tokens
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

// Example: Hash phone numbers for analytics while preserving privacy
export function anonymizePhoneNumber(phone: string): string {
  return hashIdentifier(phone);
}
```

**Data Sanitization:**

```typescript
// apps/api/src/utils/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input to prevent XSS
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Sanitize before storing in database
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Limit length
}
```

**GDPR Compliance:**

```typescript
// apps/api/src/services/gdpr.service.ts
export class GDPRService {
  // Export all user data
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [user, bookings, ratings, tags] = await Promise.all([
      this.db.from('users').select('*').eq('id', userId).single(),
      this.db.from('bookings').select('*').or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`),
      this.db.from('ratings').select('*').or(`rater_id.eq.${userId},rated_user_id.eq.${userId}`),
      this.db.from('user_tags').select('*').eq('user_id', userId),
    ]);
    
    return {
      user,
      bookings,
      ratings,
      tags,
      exportedAt: new Date().toISOString(),
    };
  }
  
  // Delete user data (GDPR right to be forgotten)
  async deleteUserData(userId: string): Promise<void> {
    // Hard delete user data
    await this.db.from('users').delete().eq('id', userId);
    
    // Anonymize historical records
    await this.db
      .from('bookings')
      .update({ 
        meeting_goal: '[DELETED]',
        materials_urls: [],
      })
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`);
    
    // Log deletion for audit
    await this.auditLog.log({
      action: 'gdpr_deletion',
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 12.4 API Security

**Input Validation (Zod):**

```typescript
// apps/api/src/schemas/booking.schema.ts
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  time_slot_id: z.string().uuid(),
  meeting_goal: z.string()
    .min(10, 'Meeting goal must be at least 10 characters')
    .max(1000, 'Meeting goal must be less than 1000 characters')
    .refine(val => sanitizeUserInput(val) === val, {
      message: 'Meeting goal contains invalid characters',
    }),
  materials_urls: z.array(
    z.string().url('Invalid URL format')
  ).max(5, 'Maximum 5 material URLs allowed').optional(),
});

// Automatic validation in routes
app.post('/api/bookings', 
  zValidator('json', CreateBookingSchema),
  async (c) => {
    const data = c.req.valid('json'); // Type-safe and validated
    // Process booking...
  }
);
```

**Rate Limiting:**

```typescript
// apps/api/src/middleware/rate-limit.ts
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}
  
  async checkLimit(identifier: string): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const current = await this.kv.get(key);
    
    if (!current) {
      await this.kv.put(key, '1', { 
        expirationTtl: Math.floor(this.config.windowMs / 1000) 
      });
      return true;
    }
    
    const count = parseInt(current, 10);
    
    if (count >= this.config.maxRequests) {
      return false;
    }
    
    await this.kv.put(key, String(count + 1), { 
      expirationTtl: Math.floor(this.config.windowMs / 1000) 
    });
    return true;
  }
}

// Middleware
export const rateLimitMiddleware = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const identifier = c.get('user')?.id || c.req.header('cf-connecting-ip') || 'anonymous';
    const limiter = new RateLimiter(c.env.RATE_LIMIT, config);
    
    const allowed = await limiter.checkLimit(identifier);
    
    if (!allowed) {
      throw new AppError(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED');
    }
    
    await next();
  };
};

// Apply to routes
app.post('/api/bookings', 
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 10 }),
  async (c) => { /* ... */ }
);
```

**CORS Configuration:**

```typescript
// apps/api/src/middleware/cors.ts
import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000',
    'https://officehours.youcanjustdothings.io',
    'https://staging.officehours.youcanjustdothings.io',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true,
});
```

**SQL Injection Prevention:**

```typescript
// Always use parameterized queries via Supabase client
// ✅ SAFE: Supabase automatically parameterizes
const user = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput) // Automatically escaped
  .single();

// ❌ UNSAFE: Never use string concatenation
// const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// For complex queries, use prepared statements
const { data } = await supabase.rpc('get_user_bookings', {
  p_user_id: userId,
  p_start_date: startDate,
});
```

## 12.5 Frontend Security

**XSS Prevention:**

```typescript
// apps/web/src/components/common/SafeHtml.tsx
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  allowedTags?: string[];
}

export function SafeHtml({ html, allowedTags }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Usage
<SafeHtml html={userProvidedContent} />
```

**CSRF Protection:**

```typescript
// Not required for JWT-based auth with proper CORS
// Supabase handles CSRF tokens for session-based auth automatically

// For additional protection on sensitive operations:
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomUUID();
  sessionStorage.setItem('csrf_token', token);
  return token;
}

export function verifyCSRFToken(token: string): boolean {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken;
}
```

**Secure Storage:**

```typescript
// apps/web/src/lib/secure-storage.ts

// ✅ SAFE: Store JWT in memory or localStorage (acceptable for this use case)
// Supabase handles token storage securely
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true, // Stores in localStorage
    autoRefreshToken: true,
  },
});

// ❌ NEVER store sensitive data in localStorage without encryption
// ❌ NEVER store passwords or credit cards client-side

// For sensitive client-side data (if needed):
export class SecureStorage {
  private encryptionKey: CryptoKey | null = null;
  
  async init() {
    // Derive key from user session (example)
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      this.encryptionKey = await this.deriveKey(session.data.session.access_token);
    }
  }
  
  private async deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('salt'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

**Content Security Policy:**

```typescript
// apps/web/_headers (Cloudflare Pages)
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io https://accounts.google.com https://login.microsoftonline.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 12.6 Performance Optimization

**Frontend Performance:**

**1. Code Splitting:**

```typescript
// apps/web/src/App.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MentorDirectory = lazy(() => import('./pages/MentorDirectory'));
const BookingFlow = lazy(() => import('./pages/BookingFlow'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mentors" element={<MentorDirectory />} />
        <Route path="/book/:mentorId" element={<BookingFlow />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}
```

**2. React Query Optimization:**

```typescript
// apps/web/src/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Optimized query with stale time and cache time
export function useBookings() {
  return useQuery({
    queryKey: ['bookings', 'my-bookings'],
    queryFn: fetchMyBookings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Optimistic updates
export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBooking,
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      
      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(['bookings', 'my-bookings']);
      
      // Optimistically update
      queryClient.setQueryData(['bookings', 'my-bookings'], (old: Booking[]) => [
        ...old,
        { ...newBooking, id: 'temp-id', status: 'confirmed' },
      ]);
      
      return { previousBookings };
    },
    onError: (err, newBooking, context) => {
      // Rollback on error
      queryClient.setQueryData(['bookings', 'my-bookings'], context.previousBookings);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

**3. Memoization:**

```typescript
// apps/web/src/components/MentorCard.tsx
import { memo, useMemo } from 'react';

interface MentorCardProps {
  mentor: Mentor;
  onBook: (mentorId: string) => void;
}

export const MentorCard = memo(function MentorCard({ mentor, onBook }: MentorCardProps) {
  // Memoize expensive calculations
  const matchScore = useMemo(() => {
    return calculateMatchScore(mentor, currentUser);
  }, [mentor.id, currentUser.id]);
  
  // Memoize event handlers to prevent re-renders
  const handleBook = useCallback(() => {
    onBook(mentor.id);
  }, [mentor.id, onBook]);
  
  return (
    <Card>
      <h3>{mentor.name}</h3>
      <p>Match: {matchScore}%</p>
      <Button onClick={handleBook}>Book</Button>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.mentor.id === nextProps.mentor.id 
    && prevProps.mentor.updated_at === nextProps.mentor.updated_at;
});
```

**4. Virtual Scrolling:**

```typescript
// apps/web/src/components/MentorList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function MentorList({ mentors }: { mentors: Mentor[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: mentors.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated item height
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const mentor = mentors[virtualRow.index];
          return (
            <div
              key={mentor.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MentorCard mentor={mentor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Backend Performance:**

**1. Database Query Optimization:**

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_bookings_mentor_start 
  ON bookings(mentor_id, meeting_start_time) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_time_slots_availability 
  ON time_slots(mentor_id, start_time, is_booked) 
  WHERE deleted_at IS NULL AND is_booked = false;

CREATE INDEX idx_users_search 
  ON users USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')))
  WHERE deleted_at IS NULL;

-- Use EXPLAIN ANALYZE to optimize queries
EXPLAIN ANALYZE
SELECT b.*, u1.name as mentor_name, u2.name as mentee_name
FROM bookings b
JOIN users u1 ON b.mentor_id = u1.id
JOIN users u2 ON b.mentee_id = u2.id
WHERE b.mentor_id = 'xxx'
  AND b.meeting_start_time > NOW()
  AND b.deleted_at IS NULL
ORDER BY b.meeting_start_time;
```

**2. Caching with KV:**

```typescript
// apps/api/src/services/cache.service.ts
export class CacheService {
  constructor(private kv: KVNamespace) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get(key, 'json');
    return cached as T | null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    });
  }
  
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

// Usage in services
export class MentorService {
  async getMentorProfile(mentorId: string): Promise<Mentor> {
    const cacheKey = `mentor:${mentorId}`;
    
    // Check cache first
    const cached = await this.cache.get<Mentor>(cacheKey);
    if (cached) return cached;
    
    // Fetch from database
    const mentor = await this.repository.findById(mentorId);
    
    // Cache for 10 minutes
    await this.cache.set(cacheKey, mentor, 600);
    
    return mentor;
  }
}
```

**3. Connection Pooling:**

```typescript
// Supabase client handles connection pooling automatically
// For custom database connections (if needed):
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pooled connections
export async function query(text: string, params: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  console.log('Query executed', { text, duration, rows: res.rowCount });
  return res;
}
```

**4. Response Compression:**

```typescript
// Cloudflare automatically handles compression
// For additional optimization, compress large responses:
import { compress } from 'hono/compress';

app.use('*', compress());

// Or selectively compress:
app.get('/api/mentors', compress(), async (c) => {
  const mentors = await getMentors();
  return c.json(mentors);
});
```

## 12.7 Performance Monitoring

**Frontend Metrics:**

```typescript
// apps/web/src/lib/performance.ts
export function trackPageLoad() {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      console.log('Performance Metrics', {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        load: perfData.loadEventEnd - perfData.loadEventStart,
      });
    });
  }
}

// Track specific operations
export function trackOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  
  return operation().finally(() => {
    const duration = performance.now() - start;
    console.log(`Operation: ${name} took ${duration.toFixed(2)}ms`);
  });
}
```

**Backend Metrics:**

```typescript
// apps/api/src/middleware/metrics.ts
export const metricsMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const path = new URL(c.req.url).pathname;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  // Log metrics
  console.log({
    method: c.req.method,
    path,
    status,
    duration,
    timestamp: new Date().toISOString(),
  });
  
  // Track slow queries
  if (duration > 2000) {
    console.warn('Slow request detected', { path, duration });
  }
};
```

## 12.8 Security Checklist

**Development:**
- [ ] All dependencies up to date
- [ ] No hardcoded secrets in code
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize HTML)
- [ ] CSRF tokens for sensitive operations

**Deployment:**
- [ ] HTTPS enabled (Cloudflare SSL)
- [ ] Secure headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets stored in environment variables
- [ ] Database RLS policies enabled
- [ ] File upload size limits enforced
- [ ] Error messages don't leak sensitive info

**Ongoing:**
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Monitor authentication failures
- [ ] Review access logs
- [ ] Update dependencies regularly
- [ ] Rotate secrets periodically

---

