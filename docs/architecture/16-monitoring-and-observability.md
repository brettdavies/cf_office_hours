# 16. Monitoring and Observability

This section defines the monitoring and observability strategy for the CF Office Hours platform. The MVP uses minimal built-in tools with stubbed telemetry interfaces for future expansion.

## 16.1 Observability Philosophy

**Core Principles:**
- **MVP-First** - Use free, built-in tools for initial monitoring
- **Interface-Driven** - Define telemetry interfaces now, implement later
- **Strategic Instrumentation** - Document where metrics should be collected
- **Expand Later** - Full observability platform deferred to future SOW

**Three Pillars of Observability:**
1. **Metrics** - Quantitative measurements (request count, error rate, latency)
2. **Logs** - Discrete events (errors, important actions, state changes)
3. **Traces** - Request lifecycle tracking (distributed tracing)

**MVP Scope:**
- ✅ Basic health checks
- ✅ Built-in dashboard metrics (Cloudflare, Supabase)
- ✅ Console logging (development/staging)
- ✅ Telemetry interface definitions (stubs)
- ❌ Third-party APM (Sentry, New Relic) - Post-MVP
- ❌ Custom metrics dashboards (Grafana) - Post-MVP
- ❌ Distributed tracing (Jaeger, Zipkin) - Post-MVP

---

## 16.2 Health Checks

### 16.2.1 API Health Endpoint

```typescript
// src/routes/health.ts

// External dependencies
import { Hono } from 'hono';

// Internal modules
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const healthRouter = new Hono();

/**
 * Basic health check endpoint.
 * Returns 200 OK if service is healthy.
 */
healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cf-office-hours-api',
  });
});

/**
 * Detailed health check with dependency status.
 * Checks database connectivity.
 */
healthRouter.get('/detailed', async (c) => {
  const checks = {
    api: 'ok',
    database: 'unknown',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database connectivity
    await db.from('users').select('id').limit(1);
    checks.database = 'ok';
  } catch (error) {
    logger.error('Database health check failed', { error });
    checks.database = 'error';
  }

  const isHealthy = checks.database === 'ok';
  const statusCode = isHealthy ? 200 : 503;

  return c.json(checks, statusCode);
});

export { healthRouter };
```

**Frontend Health Check (Optional):**

```typescript
// src/lib/health-check.ts

/**
 * Checks if the API is reachable.
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-cache',
    });
    return response.ok;
  } catch (error) {
    logger.error('API health check failed', { error });
    return false;
  }
};
```

---

## 16.3 Built-In Monitoring Tools

### 16.3.1 Cloudflare Workers Dashboard (Free)

**Available Metrics:**
- Request count (per endpoint)
- Request duration (p50, p95, p99)
- Error rate (HTTP 5xx responses)
- CPU time per invocation
- Egress bandwidth

**Access:**
- Dashboard: `https://dash.cloudflare.com`
- Navigate to: Workers & Pages → cf-oh-api → Metrics

**What to Monitor:**
- API response times (target: <2s for core endpoints)
- Error rate (target: <1%)
- Request volume trends
- CPU time usage (stay within limits)

### 16.3.2 Cloudflare Pages Dashboard (Free)

**Available Metrics:**
- Build success/failure rate
- Deployment duration
- Page views (if Cloudflare Analytics enabled)
- Bandwidth usage

**Access:**
- Dashboard: `https://dash.cloudflare.com`
- Navigate to: Workers & Pages → cf-office-hours → Deployments

### 16.3.3 Supabase Dashboard (Free)

**Available Metrics:**
- Database query performance (slow queries)
- Connection pool usage
- Storage usage (pitch decks, avatars)
- Auth activity (logins, signups)
- Realtime connections

**Access:**
- Dashboard: `https://supabase.com/dashboard/project/{project-id}`
- Navigate to: Database → Query Performance, Storage → Usage

**What to Monitor:**
- Slow queries (target: <500ms)
- Storage growth rate
- Auth success/failure rates
- Realtime connection count

---

## 16.4 Telemetry Interfaces (Stubs)

### 16.4.1 ITelemetryProvider Interface

```typescript
// src/lib/telemetry/telemetry-provider.interface.ts

/**
 * Telemetry provider interface for metrics, events, and traces.
 * Implementations: NoOpTelemetryProvider (MVP), OpenTelemetryProvider (future).
 */
export interface ITelemetryProvider {
  /**
   * Tracks a custom event.
   *
   * @param name - Event name (e.g., 'booking_created', 'tier_override_approved')
   * @param properties - Additional event properties
   */
  trackEvent(name: string, properties?: Record<string, unknown>): void;

  /**
   * Tracks a custom metric (counter, gauge, histogram).
   *
   * @param name - Metric name (e.g., 'booking_count', 'api_response_time')
   * @param value - Metric value
   * @param tags - Metric tags for filtering/grouping
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Tracks an exception/error.
   *
   * @param error - The error object
   * @param properties - Additional error context
   */
  trackException(error: Error, properties?: Record<string, unknown>): void;

  /**
   * Starts a distributed trace span.
   *
   * @param name - Span name (e.g., 'bookingService.createBooking')
   * @param attributes - Span attributes
   * @returns Span handle for ending the span
   */
  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan;

  /**
   * Flushes any pending telemetry data.
   */
  flush(): Promise<void>;
}

/**
 * Telemetry span for distributed tracing.
 */
export interface ITelemetrySpan {
  /**
   * Ends the span and records its duration.
   */
  end(): void;

  /**
   * Sets an attribute on the span.
   */
  setAttribute(key: string, value: unknown): void;

  /**
   * Records an exception within the span.
   */
  recordException(error: Error): void;
}
```

---

### 16.4.2 No-Op Implementation (MVP)

```typescript
// src/lib/telemetry/noop-telemetry-provider.ts

import type { ITelemetryProvider, ITelemetrySpan } from './telemetry-provider.interface';

/**
 * No-op telemetry provider for MVP.
 * Methods do nothing but satisfy the interface.
 */
class NoOpTelemetryProvider implements ITelemetryProvider {
  trackEvent(name: string, properties?: Record<string, unknown>): void {
    // No-op
  }

  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    // No-op
  }

  trackException(error: Error, properties?: Record<string, unknown>): void {
    // No-op
  }

  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan {
    return new NoOpSpan();
  }

  async flush(): Promise<void> {
    // No-op
  }
}

/**
 * No-op telemetry span.
 */
class NoOpSpan implements ITelemetrySpan {
  end(): void {
    // No-op
  }

  setAttribute(key: string, value: unknown): void {
    // No-op
  }

  recordException(error: Error): void {
    // No-op
  }
}

export const telemetry = new NoOpTelemetryProvider();
```

---

### 16.4.3 OpenTelemetry Stub (Future Implementation)

```typescript
// src/lib/telemetry/opentelemetry-provider.ts
// NOTE: This is a stub for future implementation. Not used in MVP.

import { trace, metrics, context } from '@opentelemetry/api';
import type { ITelemetryProvider, ITelemetrySpan } from './telemetry-provider.interface';

/**
 * OpenTelemetry-based telemetry provider.
 * STUB: To be implemented in future SOW.
 *
 * Setup would include:
 * - OTLP exporter configuration
 * - Resource detection (service name, version, environment)
 * - Tracer provider setup
 * - Meter provider setup
 */
class OpenTelemetryProvider implements ITelemetryProvider {
  private tracer = trace.getTracer('cf-office-hours');
  private meter = metrics.getMeter('cf-office-hours');

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    // TODO: Implement event tracking
    // - Convert event to span or log
    // - Add properties as attributes
  }

  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    // TODO: Implement metric tracking
    // - Create counter/gauge/histogram based on metric name
    // - Add tags as metric attributes
  }

  trackException(error: Error, properties?: Record<string, unknown>): void {
    // TODO: Implement exception tracking
    // - Record exception on current span
    // - Add properties as attributes
  }

  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan {
    // TODO: Implement span creation
    // - Start new span with tracer
    // - Add attributes
    // - Return wrapped span
    return new NoOpSpan(); // Placeholder
  }

  async flush(): Promise<void> {
    // TODO: Implement flush
    // - Flush tracer provider
    // - Flush meter provider
  }
}

/**
 * Example OpenTelemetry configuration (commented out for MVP).
 */
/*
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
  }),
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'cf-office-hours-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
});

sdk.start();
*/
```

---

## 16.5 Instrumentation Points (Documented)

This section documents where telemetry SHOULD be collected when a full observability platform is implemented. For MVP, these are **inline comments only**.

### 16.5.1 Backend Instrumentation

**API Request Metrics:**

```typescript
// src/index.ts

import { Hono } from 'hono';
import { telemetry } from '@/lib/telemetry/noop-telemetry-provider';

const app = new Hono();

// Middleware: Request metrics
app.use('*', async (c, next) => {
  const start = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  // TELEMETRY: Start span for request
  // const span = telemetry.startSpan('http.request', {
  //   'http.method': method,
  //   'http.route': path,
  // });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // TELEMETRY: Track request metrics
  // telemetry.trackMetric('http.request.duration', duration, {
  //   method,
  //   route: path,
  //   status: status.toString(),
  // });
  //
  // telemetry.trackMetric('http.request.count', 1, {
  //   method,
  //   route: path,
  //   status: status.toString(),
  // });
  //
  // span.setAttribute('http.status_code', status);
  // span.end();
});
```

**Business Event Tracking:**

```typescript
// src/services/booking-service.ts

export class BookingService {
  async createBooking(params: ICreateBookingParams): Promise<IBooking> {
    const span = telemetry.startSpan('bookingService.createBooking');

    try {
      // Business logic...
      const booking = await db.insert(/* ... */);

      // TELEMETRY: Track business event
      // telemetry.trackEvent('booking_created', {
      //   bookingId: booking.id,
      //   mentorId: booking.mentorId,
      //   menteeId: booking.menteeId,
      //   meetingType: booking.meetingType,
      // });

      span.end();
      return booking;
    } catch (error) {
      span.recordException(error);
      span.end();
      throw error;
    }
  }

  async cancelBooking(bookingId: string, canceledBy: string): Promise<void> {
    // TELEMETRY: Track cancellation event
    // telemetry.trackEvent('booking_canceled', {
    //   bookingId,
    //   canceledBy,
    //   cancellationTime: new Date().toISOString(),
    // });

    // Business logic...
  }
}
```

**Database Query Metrics:**

```typescript
// src/lib/db-helpers.ts

export const dbHelpers = {
  async executeQuery<T>(query: () => Promise<T>, queryName: string): Promise<T> {
    const start = Date.now();

    // TELEMETRY: Start span for query
    // const span = telemetry.startSpan('db.query', {
    //   'db.operation': queryName,
    // });

    try {
      const result = await query();
      const duration = Date.now() - start;

      // TELEMETRY: Track query duration
      // telemetry.trackMetric('db.query.duration', duration, {
      //   operation: queryName,
      //   status: 'success',
      // });

      // span.end();
      return result;
    } catch (error) {
      // TELEMETRY: Track query failure
      // telemetry.trackMetric('db.query.error', 1, {
      //   operation: queryName,
      // });
      // span.recordException(error);
      // span.end();

      throw error;
    }
  },
};
```

**External Service Calls:**

```typescript
// src/providers/google-calendar-provider.ts

export class GoogleCalendarProvider implements ICalendarProvider {
  async createEvent(input: ICreateEventInput): Promise<ICalendarEvent> {
    // TELEMETRY: Start span for external call
    // const span = telemetry.startSpan('calendarProvider.createEvent', {
    //   provider: 'google',
    //   eventType: input.conferenceType,
    // });

    try {
      const response = await this.googleClient.calendar.events.insert(/* ... */);

      // TELEMETRY: Track successful calendar event creation
      // telemetry.trackEvent('calendar_event_created', {
      //   provider: 'google',
      //   eventId: response.data.id,
      //   hasConference: !!input.conferenceType,
      // });

      // span.end();
      return this.parseEvent(response.data);
    } catch (error) {
      // TELEMETRY: Track calendar provider error
      // telemetry.trackException(error, {
      //   provider: 'google',
      //   operation: 'createEvent',
      // });
      // span.recordException(error);
      // span.end();

      throw error;
    }
  }
}
```

---

### 16.5.2 Frontend Instrumentation

**Page Views:**

```typescript
// src/App.tsx

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '@/lib/telemetry/noop-telemetry-provider';

export function App() {
  const location = useLocation();

  useEffect(() => {
    // TELEMETRY: Track page view
    // telemetry.trackEvent('page_view', {
    //   path: location.pathname,
    //   timestamp: new Date().toISOString(),
    // });
  }, [location.pathname]);

  return <RouterProvider />;
}
```

**User Interactions:**

```typescript
// src/features/bookings/BookingForm.tsx

export function BookingForm({ slotId, onSubmit }: IBookingFormProps) {
  const handleSubmit = async (data: BookingFormData) => {
    // TELEMETRY: Track booking form submission
    // telemetry.trackEvent('booking_form_submitted', {
    //   slotId,
    //   hasGoal: !!data.meetingGoal,
    //   hasMaterials: !!data.materialsUrls?.length,
    // });

    try {
      await onSubmit({ ...data, slotId });

      // TELEMETRY: Track successful booking
      // telemetry.trackEvent('booking_form_success', { slotId });

      toast.success('Booking confirmed!');
    } catch (error) {
      // TELEMETRY: Track booking error
      // telemetry.trackException(error, {
      //   context: 'booking_form_submission',
      //   slotId,
      // });

      logger.error('Booking submission failed', { error });
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

**Performance Metrics (Web Vitals):**

```typescript
// src/lib/performance.ts
// STUB: Web Vitals tracking for future implementation

import { onCLS, onFID, onLCP } from 'web-vitals';

/**
 * Initializes Web Vitals tracking.
 * Sends Core Web Vitals metrics to telemetry provider.
 *
 * STUB: Uncomment when telemetry provider is implemented.
 */
export const initPerformanceTracking = (): void => {
  // onCLS((metric) => {
  //   telemetry.trackMetric('web_vitals.cls', metric.value, {
  //     rating: metric.rating,
  //   });
  // });

  // onFID((metric) => {
  //   telemetry.trackMetric('web_vitals.fid', metric.value, {
  //     rating: metric.rating,
  //   });
  // });

  // onLCP((metric) => {
  //   telemetry.trackMetric('web_vitals.lcp', metric.value, {
  //     rating: metric.rating,
  //   });
  // });
};
```

---

## 16.6 Alerting Strategy (Future)

**Critical Alerts (Deferred to Post-MVP):**

When a full observability platform is implemented, configure alerts for:

**API Health:**
- Error rate >5% for 5 minutes → Alert coordinators
- API response time p95 >5s for 5 minutes → Alert developers
- Health check failures for 3 consecutive checks → Alert on-call

**Database:**
- Database connection pool >80% utilization → Alert developers
- Slow queries >2s consistently → Alert developers
- Storage >80% capacity → Alert administrators

**Bookings (Business Metrics):**
- Booking creation failure rate >10% → Alert coordinators
- Zero bookings created in 24 hours → Alert coordinators (potential system issue)
- Tier override requests pending >50 → Alert coordinators

**External Services:**
- Calendar API error rate >20% → Alert developers
- Airtable sync failures >3 consecutive attempts → Alert administrators

**Implementation Tools (Post-MVP):**
- PagerDuty, Opsgenie, or similar for on-call rotation
- Email/SMS notifications for critical alerts
- Slack integration for non-critical alerts

---

## 16.7 Dashboard Requirements (Future)

**MVP: Use Built-In Dashboards Only**

**Post-MVP: Custom Dashboard Tools**

When implementing custom dashboards (Grafana, Datadog, etc.), include:

**Operations Dashboard:**
- API request volume (requests/min)
- API error rate (%)
- API response time (p50, p95, p99)
- Database query performance
- Active user sessions

**Business Metrics Dashboard:**
- Bookings created (daily/weekly trends)
- Mentor utilization rate
- User growth (signups/day)
- Reputation tier distribution
- Top mentors/mentees by activity

**System Health Dashboard:**
- CPU/memory usage (Workers)
- Database connection pool usage
- Storage usage (pitch decks, avatars)
- Cache hit rate (if implemented)
- External API latency (Google Calendar, Microsoft Graph)

---

## 16.8 Logging Retention Policy

**MVP: No Automated Retention (Unlimited)**

Logs remain in browser console (dev) and Cloudflare dashboard (production) until manually cleared or rotated by platform.

**Post-MVP: Implement Retention Policy**

When a logging aggregation service is added (Better Stack, Axiom, Datadog):

| Log Level | Retention Period | Reason |
|-----------|------------------|--------|
| ERROR     | 90 days          | Debugging, incident response |
| WARN      | 30 days          | Issue investigation |
| INFO      | 7 days           | Operational visibility |
| DEBUG     | 1 day            | Development only |

**Archive Strategy:**
- Archive old logs to S3 or similar (cold storage)
- Compress archived logs
- Automated cleanup of archives >1 year old

---

## 16.9 Observability Roadmap

**Phase 1 (MVP - Current):**
- ✅ Health check endpoints
- ✅ Built-in Cloudflare/Supabase dashboards
- ✅ Console logging (dev/staging)
- ✅ Telemetry interface definitions (stubs)

**Phase 2 (Post-MVP - Future SOW):**
- Error tracking service (Sentry, Rollbar)
- Basic metrics collection (request count, error rate)
- Custom alerting for critical failures
- Log aggregation (Better Stack, Axiom)

**Phase 3 (Advanced - Future SOW):**
- Distributed tracing (OpenTelemetry + Jaeger/Tempo)
- Custom metrics dashboards (Grafana, Datadog)
- Business metrics tracking
- Performance monitoring (Web Vitals, RUM)

**Phase 4 (Mature - Future SOW):**
- Advanced analytics (user behavior, funnel analysis)
- Predictive alerting (anomaly detection)
- Cost optimization monitoring
- Compliance auditing (GDPR, SOC2)

---

## 16.10 Developer Debugging Tools

**Local Development:**

```typescript
// src/lib/debug.ts

/**
 * Debug utilities for local development.
 * Only active in development environment.
 */
export const debug = {
  /**
   * Logs performance timing for a function.
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (import.meta.env.MODE !== 'development') {
      return fn();
    }

    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  },

  /**
   * Logs detailed state for debugging.
   */
  log: (label: string, data: unknown): void => {
    if (import.meta.env.MODE !== 'development') return;

    console.group(`🐛 ${label}`);
    console.log(data);
    console.groupEnd();
  },

  /**
   * Breakpoint helper (pauses execution in dev only).
   */
  breakpoint: (): void => {
    if (import.meta.env.MODE !== 'development') return;
    debugger;
  },
};
```

**React DevTools:**
- Use React DevTools extension for component inspection
- Use Profiler tab for performance analysis
- Use Hooks tab for hook state inspection

**Backend Debugging:**
```bash
# Cloudflare Workers local development with live reload
wrangler dev --local --persist

# Inspect logs in real-time
wrangler tail --format pretty

# Test API endpoint locally
curl -X POST http://localhost:8787/api/bookings \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"mentorId":"123","timeSlotId":"456","meetingGoal":"Discuss funding strategy"}'
```

---

## 16.11 Monitoring Checklist

**Before Production Launch:**
- [ ] Health check endpoints responding correctly
- [ ] Cloudflare Workers dashboard accessible
- [ ] Supabase dashboard accessible and showing data
- [ ] Error logging configured (dev/staging confirmed working)
- [ ] Telemetry interfaces defined (stubs in place)
- [ ] All critical paths instrumented with inline comments
- [ ] Test error scenarios (500 errors, database failures) to confirm logging

**Post-Launch (First Week):**
- [ ] Monitor API error rate daily
- [ ] Check Supabase for slow queries
- [ ] Review booking creation success rate
- [ ] Monitor storage growth
- [ ] Check authentication success/failure rates

**Ongoing (Weekly):**
- [ ] Review Cloudflare request trends
- [ ] Check database performance metrics
- [ ] Monitor storage usage growth
- [ ] Review any logged errors in production

---

**Section 16 Complete.** This monitoring and observability strategy provides:
- ✅ MVP-first approach using built-in tools (Cloudflare, Supabase)
- ✅ Health check endpoints (basic and detailed)
- ✅ Telemetry interface definitions (`ITelemetryProvider`, `ITelemetrySpan`)
- ✅ No-op telemetry implementation for MVP
- ✅ OpenTelemetry stub for future implementation
- ✅ Documented instrumentation points (inline comments)
- ✅ Alerting strategy (deferred to post-MVP)
- ✅ Dashboard requirements (deferred to post-MVP)
- ✅ Logging retention policy
- ✅ Observability roadmap (phased approach)
- ✅ Developer debugging tools
- ✅ Monitoring checklist for launch and ongoing operations



---
