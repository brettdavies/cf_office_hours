# 15. Error Handling Strategy

This section defines the comprehensive error handling strategy for the CF Office Hours platform, covering frontend error boundaries, backend error handling, logging practices, and user-facing error messages.

## 15.1 Error Handling Philosophy

**Core Principles:**
- **Centralized handling** - Consistent error processing across the application
- **User-friendly messages** - Avoid technical jargon, provide actionable guidance
- **Fail gracefully** - Degrade functionality rather than crash
- **Log comprehensively** - Capture context for debugging (dev/staging only by default)
- **Explicit over silent** - Surface errors clearly, never swallow them

**Error Categories:**
1. **User Errors** - Validation failures, permission issues (400s)
2. **System Errors** - Server failures, database issues (500s)
3. **External Errors** - Third-party API failures (calendar, Airtable)
4. **Network Errors** - Connectivity issues, timeouts

---

## 15.2 Frontend Error Handling

### 15.2.1 Error Boundary Strategy

**Global Error Boundary:**

Catches all unhandled React errors across the entire application.

```typescript
// src/components/ErrorBoundary.tsx

// External dependencies
import React, { Component, ErrorInfo, ReactNode } from 'react';

// Internal modules
import { logger } from '@/lib/logger';
import { ErrorFallback } from '@/components/ErrorFallback';

// Types
interface IErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary that catches all unhandled React errors.
 * Displays a fallback UI and logs errors for debugging.
 */
export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  constructor(props: IErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('React Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
```

**Feature-Level Error Boundary (Booking Flow):**

Provides better UX for the critical booking flow by isolating errors.

```typescript
// src/features/bookings/BookingErrorBoundary.tsx

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

/**
 * Error boundary for the booking flow.
 * Provides booking-specific error handling and recovery.
 */
export function BookingErrorBoundary({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    toast.error('Something went wrong with your booking. Please try again.');
    logger.error('Booking flow error:', { error: error.message });
  };

  const handleReset = () => {
    navigate('/bookings');
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div className="error-container">
          <h2>Booking Error</h2>
          <p>We encountered an issue processing your booking.</p>
          <button onClick={handleReset}>Return to Bookings</button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

**Error Fallback Component:**

```typescript
// src/components/ErrorFallback.tsx

interface IErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export function ErrorFallback({ error, onReset }: IErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <div className="error-content">
        <h1>Something went wrong</h1>
        <p>We're sorry, but something unexpected happened.</p>

        {import.meta.env.DEV && error && (
          <details className="error-details">
            <summary>Error Details (Dev Only)</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}

        <div className="error-actions">
          <button onClick={onReset}>Try Again</button>
          <button onClick={() => window.location.href = '/'}>
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 15.2.2 API Client Error Handling

**Centralized API Client:**

```typescript
// src/lib/api-client.ts

// External dependencies
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Internal modules
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import { getErrorMessage } from '@/lib/error-messages';

// Types
import type { IApiError } from '@/types/api-types';

/**
 * Centralized API client with consistent error handling and user feedback.
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<IApiError>) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError<IApiError>): void {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const errorMessage = error.response?.data?.error?.message;

    logger.error('API Error:', {
      status,
      errorCode,
      message: errorMessage,
      url: error.config?.url,
    });

    // Handle specific status codes
    switch (status) {
      case 401:
        // Session expired
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        break;

      case 403:
        // Forbidden
        const forbiddenMessage = getErrorMessage(errorCode, 'You do not have permission to perform this action.');
        toast.error(forbiddenMessage);
        break;

      case 404:
        // Not found
        const notFoundMessage = getErrorMessage(errorCode, 'Resource not found.');
        toast.error(notFoundMessage);
        break;

      case 409:
        // Conflict (e.g., slot already booked, tier restriction)
        const conflictMessage = getErrorMessage(errorCode, errorMessage || 'A conflict occurred.');
        toast.error(conflictMessage);
        break;

      case 422:
        // Validation error
        const validationMessage = getErrorMessage(errorCode, errorMessage || 'Please check your input and try again.');
        toast.error(validationMessage);
        break;

      case 500:
      case 502:
      case 503:
        // Server errors
        toast.error('Server error. Please try again later.');
        break;

      default:
        // Generic error
        if (error.message === 'Network Error') {
          toast.error('Network error. Please check your connection.');
        } else {
          const genericMessage = getErrorMessage(errorCode, 'An unexpected error occurred.');
          toast.error(genericMessage);
        }
    }
  }

  /**
   * Performs a GET request.
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Performs a POST request.
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a PUT request.
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a DELETE request.
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

---

### 15.2.3 Error Message Dictionary

**Centralized Error Messages:**

```typescript
// src/lib/error-messages.ts

/**
 * Centralized error message dictionary.
 * Maps error codes to user-friendly messages.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_WHITELISTED: 'Your email is not authorized. Please contact an administrator for access.',

  // User & Profile
  USER_NOT_FOUND: 'User not found.',
  PROFILE_NOT_FOUND: 'Profile not found.',
  PROFILE_FETCH_ERROR: 'Failed to load user profile. Please try again.',

  // Bookings
  BOOKING_NOT_FOUND: 'Booking not found.',
  SLOT_UNAVAILABLE: 'This time slot is no longer available. Please select another slot.',
  SLOT_ALREADY_BOOKED: 'This slot was just booked by another user. Please select another slot.',
  CALENDAR_CONFLICT: 'You have a conflicting event on your calendar at this time.',
  BOOKING_LIMIT_REACHED: 'You have reached your weekly booking limit for your tier.',
  CALENDAR_CONNECTION_REQUIRED: 'Please connect your calendar to book meetings.',
  BOOKING_TOO_SOON: 'Bookings must be made at least 1 day in advance.',

  // Reputation & Tiers
  TIER_RESTRICTION: 'This mentor requires a higher reputation tier. You can request an exception.',
  DORMANT_USER: 'This user is currently inactive. Please contact a coordinator for assistance.',

  // Availability
  AVAILABILITY_NOT_FOUND: 'Availability block not found.',
  AVAILABILITY_HAS_BOOKINGS: 'Cannot delete availability with confirmed bookings. Cancel the bookings first.',

  // Tier Overrides
  OVERRIDE_REQUEST_NOT_FOUND: 'Override request not found.',
  OVERRIDE_ALREADY_USED: 'This override has already been used.',
  OVERRIDE_EXPIRED: 'This override request has expired.',

  // Calendar Integration
  CALENDAR_PROVIDER_ERROR: 'Failed to connect to your calendar provider. Please try again.',
  CALENDAR_TOKEN_EXPIRED: 'Your calendar connection has expired. Please reconnect.',

  // Airtable Sync
  AIRTABLE_SYNC_ERROR: 'Failed to sync data from Airtable.',

  // Validation
  VALIDATION_ERROR: 'Please check your input and try again.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',

  // Generic
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
};

/**
 * Gets a user-friendly error message for a given error code.
 *
 * @param errorCode - The error code from the API
 * @param fallback - Fallback message if error code not found
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  errorCode: string | undefined,
  fallback: string = ERROR_MESSAGES.INTERNAL_ERROR
): string => {
  if (!errorCode) {
    return fallback;
  }

  return ERROR_MESSAGES[errorCode] || fallback;
};

/**
 * Gets multiple error messages for validation errors.
 *
 * @param errors - Array of error codes
 * @returns Array of user-friendly error messages
 */
export const getErrorMessages = (errors: string[]): string[] => {
  return errors.map((code) => getErrorMessage(code));
};
```

---

## 15.3 Backend Error Handling

### 15.3.1 Custom Error Classes

```typescript
// src/lib/errors.ts

/**
 * Base application error class.
 * Use this for all application-specific errors.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(409, message, code || 'CONFLICT');
    this.name = 'ConflictError';
  }
}
```

---

### 15.3.2 Error Handler Middleware

```typescript
// src/middleware/error-handler.ts

// External dependencies
import { Context } from 'hono';
import { ZodError } from 'zod';

// Internal modules
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

// Types
interface IErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Centralized error handler middleware for Hono.
 * Catches all errors and returns consistent JSON responses.
 */
export const errorHandler = (err: Error, c: Context): Response => {
  // Log error with context
  logger.error('API Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // Handle AppError and subclasses
  if (err instanceof AppError) {
    const response: IErrorResponse = {
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      },
    };
    return c.json(response, err.statusCode);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: IErrorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    };
    return c.json(response, 400);
  }

  // Handle Supabase/PostgreSQL errors
  if (err.message?.includes('duplicate key') || err.message?.includes('violates unique constraint')) {
    const response: IErrorResponse = {
      error: {
        message: 'A record with this information already exists',
        code: 'DUPLICATE_RECORD',
      },
    };
    return c.json(response, 409);
  }

  if (err.message?.includes('foreign key constraint')) {
    const response: IErrorResponse = {
      error: {
        message: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
      },
    };
    return c.json(response, 400);
  }

  // Generic error (don't expose internal details)
  const response: IErrorResponse = {
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
  return c.json(response, 500);
};
```

**Apply to Hono App:**

```typescript
// src/index.ts

import { Hono } from 'hono';
import { errorHandler } from '@/middleware/error-handler';

const app = new Hono();

// Apply error handler
app.onError(errorHandler);

// Routes...
```

---

### 15.3.3 Error Usage in Routes

```typescript
// src/routes/bookings.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';
import { CreateBookingSchema } from '@/schemas/booking-schemas';

const bookingsRouter = new Hono();

bookingsRouter.post('/', zValidator('json', CreateBookingSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');

  // Validate slot availability
  const slot = await getSlot(input.timeSlotId);
  if (!slot) {
    throw new NotFoundError('Time slot');
  }

  if (slot.is_booked) {
    throw new ConflictError(
      'This slot is no longer available',
      'SLOT_UNAVAILABLE'
    );
  }

  // Check calendar conflicts
  const hasConflict = await calendarProvider.checkConflicts(
    user.id,
    slot.start_time,
    slot.end_time
  );

  if (hasConflict) {
    throw new ConflictError(
      'You have a conflicting event on your calendar',
      'CALENDAR_CONFLICT'
    );
  }

  // Check booking limits
  const weeklyBookings = await getWeeklyBookingCount(user.id);
  const bookingLimit = await getBookingLimit(user.id);

  if (weeklyBookings >= bookingLimit) {
    throw new AppError(
      403,
      'Weekly booking limit reached for your tier',
      'BOOKING_LIMIT_REACHED'
    );
  }

  // Create booking
  const booking = await createBooking({
    ...input,
    menteeId: user.id,
  });

  return c.json({ booking }, 201);
});

export { bookingsRouter };
```

---

## 15.4 Logging Strategy

### 15.4.1 Logger Implementation

```typescript
// src/lib/logger.ts

/**
 * Centralized logger with environment-aware output.
 * Logs to console in development and staging.
 * Production logging can be toggled via environment variable.
 */
class Logger {
  private shouldLog: boolean;

  constructor() {
    // Log in dev/staging by default
    // Production logging controlled by ENABLE_LOGGING env var
    const env = import.meta.env.MODE || process.env.NODE_ENV;
    const enableLogging = import.meta.env.VITE_ENABLE_LOGGING || process.env.ENABLE_LOGGING;

    this.shouldLog = env !== 'production' || enableLogging === 'true';
  }

  /**
   * Logs an informational message.
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.log(`[INFO] ${message}`, meta || '');
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.warn(`[WARN] ${message}`, meta || '');
  }

  /**
   * Logs an error message.
   */
  error(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.error(`[ERROR] ${message}`, meta || '');
  }

  /**
   * Logs a debug message (dev only).
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    const env = import.meta.env.MODE || process.env.NODE_ENV;
    if (env !== 'development') return;

    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

export const logger = new Logger();
```

---

### 15.4.2 Logging Best Practices

**What to Log:**

```typescript
// ✅ Good: Log important events with context
logger.info('User created booking', {
  userId: user.id,
  bookingId: booking.id,
  mentorId: booking.mentorId,
  slotTime: booking.start_time,
});

// ✅ Good: Log errors with full context
logger.error('Failed to create calendar event', {
  userId: user.id,
  bookingId: booking.id,
  provider: user.calendarProvider,
  error: error.message,
  stack: error.stack,
});

// ✅ Good: Log external API failures
logger.warn('Airtable sync failed', {
  attempt: retryCount,
  error: error.message,
  recordsProcessed: successCount,
});

// ❌ Avoid: Logging sensitive data
logger.info('User logged in', {
  email: user.email,
  password: user.password, // Never log passwords!
  token: authToken, // Never log tokens!
});

// ❌ Avoid: Excessive logging in hot paths
for (const booking of bookings) {
  logger.debug('Processing booking', { booking }); // Too verbose
}
```

**Structured Logging:**

```typescript
// ✅ Good: Consistent log structure
logger.error('API request failed', {
  path: req.path,
  method: req.method,
  status: response.status,
  duration: Date.now() - startTime,
  userId: user?.id,
  error: error.message,
});
```

---

## 15.5 Async Error Handling

**Promise Error Handling:**

```typescript
// ✅ Good: Always handle promise rejections
const fetchUserData = async (userId: string): Promise<IUser> => {
  try {
    const user = await apiClient.get<IUser>(`/users/${userId}`);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user data', { userId, error });
    throw new AppError(500, 'Failed to load user data', 'USER_FETCH_ERROR');
  }
};

// ✅ Good: Handle multiple async operations separately
const loadBookingData = async (bookingId: string) => {
  try {
    const booking = await fetchBooking(bookingId);
    const mentor = await fetchUser(booking.mentorId);
    const mentee = await fetchUser(booking.menteeId);

    return { booking, mentor, mentee };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw specific errors
    }
    logger.error('Failed to load booking data', { bookingId, error });
    throw new AppError(500, 'Failed to load booking details');
  }
};
```

**React Query Error Handling:**

```typescript
// src/hooks/useBookings.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

export const useBookings = (userId: string) => {
  return useQuery({
    queryKey: ['bookings', userId],
    queryFn: async () => {
      try {
        return await apiClient.get<IBooking[]>(`/bookings?userId=${userId}`);
      } catch (error) {
        logger.error('Failed to fetch bookings', { userId, error });
        throw error; // React Query will handle error state
      }
    },
    retry: 2, // Retry failed requests
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Usage in component
function BookingsList() {
  const { data: bookings, isLoading, error } = useBookings(user.id);

  if (error) {
    return <ErrorMessage message="Failed to load bookings" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <BookingCards bookings={bookings} />;
}
```

---

## 15.6 Form Validation Error Handling

**React Hook Form + Zod:**

```typescript
// src/features/bookings/BookingForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookingFormSchema = z.object({
  meetingGoal: z.string().min(10, 'Meeting goal must be at least 10 characters'),
  materialsUrls: z.array(z.string().url('Invalid URL')).optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export function BookingForm({ slotId, onSubmit }: IBookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  const onSubmitForm = async (data: BookingFormData) => {
    try {
      await onSubmit({ ...data, slotId });
      toast.success('Booking confirmed!');
    } catch (error) {
      // API client handles error display via toast
      logger.error('Booking submission failed', { error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      <div>
        <label htmlFor="meetingGoal">Meeting Goal</label>
        <textarea
          id="meetingGoal"
          {...register('meetingGoal')}
          aria-invalid={errors.meetingGoal ? 'true' : 'false'}
        />
        {errors.meetingGoal && (
          <p className="error-message">{errors.meetingGoal.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
      </button>
    </form>
  );
}
```

---

## 15.7 External Service Error Handling

**Calendar Provider Errors:**

```typescript
// src/providers/google-calendar-provider.ts

export class GoogleCalendarProvider implements ICalendarProvider {
  async createEvent(input: ICreateEventInput): Promise<ICalendarEvent> {
    try {
      const response = await this.googleClient.calendar.events.insert({
        calendarId: 'primary',
        resource: this.formatEvent(input),
      });

      return this.parseEvent(response.data);
    } catch (error) {
      logger.error('Google Calendar API error', {
        error: error.message,
        status: error.response?.status,
        eventSummary: input.summary,
      });

      // Handle specific Google API errors
      if (error.response?.status === 401) {
        throw new AppError(
          401,
          'Calendar connection expired. Please reconnect.',
          'CALENDAR_TOKEN_EXPIRED'
        );
      }

      if (error.response?.status === 409) {
        throw new ConflictError(
          'Calendar event conflicts with existing event',
          'CALENDAR_CONFLICT'
        );
      }

      // Generic calendar error
      throw new AppError(
        500,
        'Failed to create calendar event',
        'CALENDAR_PROVIDER_ERROR'
      );
    }
  }
}
```

**Airtable Webhook Error Handling:**

```typescript
// src/routes/webhooks/airtable.ts

export const airtableWebhookHandler = async (c: Context) => {
  const payload = await c.req.json();

  // Log raw payload
  await logWebhookPayload(payload);

  try {
    // Fetch full table
    const users = await airtableClient.fetchUsersTable();

    // Process records
    const result = await syncUsersToDatabase(users);
    
    // Update last successful sync timestamp
    await updateLastSyncTimestamp(Date.now());

    return c.json({
      success: true,
      recordsProcessed: result.count,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Airtable sync failed', {
      error: error.message,
      payload,
      lastSuccessfulSync: await getLastSyncTimestamp(),
    });

    // Don't throw - webhook should always return 200
    // (Airtable will retry on non-200 responses)
    return c.json({
      success: false,
      error: 'Sync failed',
    }, 200);
  }
};
```

**Airtable Fallback Strategy (Graceful Degradation):**

When Airtable webhooks fail or Airtable API is unavailable, the platform uses **cached user data** from the Supabase database to continue operations without interruption. This implements the graceful degradation requirement from NFR9.

```typescript
// apps/api/src/services/airtable.service.ts

export class AirtableService extends BaseService {
  private static readonly MAX_SYNC_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Get users from cache (Supabase) if Airtable is unavailable
   * or if last sync is recent enough.
   */
  async getUsersWithFallback(): Promise<User[]> {
    const lastSync = await this.getLastSyncTimestamp();
    const syncAge = Date.now() - lastSync;
    
    // If last sync is recent, use cached data
    if (syncAge < AirtableService.MAX_SYNC_AGE_MS) {
      logger.info('Using cached user data from Supabase', {
        lastSync: new Date(lastSync).toISOString(),
        ageMinutes: Math.floor(syncAge / 1000 / 60),
      });
      
      return await this.userRepo.findAllActive();
    }
    
    // Try to sync from Airtable
    try {
      const users = await this.syncFromAirtable();
      await this.updateLastSyncTimestamp(Date.now());
      return users;
    } catch (error) {
      logger.warn('Airtable unavailable, falling back to cached data', {
        error: error.message,
        lastSync: new Date(lastSync).toISOString(),
        staleness: `${Math.floor(syncAge / 1000 / 60 / 60)} hours`,
      });
      
      // Fallback to cached data even if stale
      return await this.userRepo.findAllActive();
    }
  }
  
  /**
   * Check if we should alert about stale data.
   */
  async checkSyncHealth(): Promise<SyncHealthStatus> {
    const lastSync = await this.getLastSyncTimestamp();
    const syncAge = Date.now() - lastSync;
    const hoursStale = Math.floor(syncAge / 1000 / 60 / 60);
    
    if (hoursStale > 48) {
      return {
        status: 'critical',
        message: `Airtable sync stale for ${hoursStale} hours`,
        lastSync: new Date(lastSync).toISOString(),
        action: 'alert_coordinator',
      };
    } else if (hoursStale > 24) {
      return {
        status: 'warning',
        message: `Airtable sync stale for ${hoursStale} hours`,
        lastSync: new Date(lastSync).toISOString(),
        action: 'log_warning',
      };
    }
    
    return {
      status: 'healthy',
      message: 'Airtable sync up to date',
      lastSync: new Date(lastSync).toISOString(),
    };
  }
}
```

**Fallback Behavior by Feature:**

| Feature | Fallback Strategy | User Impact |
|---------|------------------|-------------|
| **User Login** | Use cached user data from `users` table | ✅ No impact - auth still works |
| **Profile Viewing** | Show cached profile from `user_profiles` table | ✅ No impact - may show slightly stale data |
| **Tag Search** | Use cached tags from `user_tags` and `taxonomy` tables | ✅ No impact - existing tags still searchable |
| **New User Onboarding** | Cannot sync new users from Airtable | ⚠️ New CF members must wait for Airtable to recover |
| **Tag Taxonomy Updates** | Cannot sync new taxonomy entries | ⚠️ New industries/technologies not available until recovery |
| **User Data Updates** | Cannot sync profile changes from Airtable | ⚠️ Changes in Airtable won't appear until recovery |

**Monitoring & Alerting:**

```typescript
// apps/api/src/jobs/airtable-health-check.ts

/**
 * Scheduled job to monitor Airtable sync health.
 * Runs every 6 hours via Cloudflare Cron Trigger.
 */
export async function checkAirtableSyncHealth(env: Env) {
  const airtableService = new AirtableService(env);
  const health = await airtableService.checkSyncHealth();
  
  if (health.status === 'critical') {
    // Alert coordinator via email
    await env.emailService.sendAlert({
      to: env.COORDINATOR_EMAIL,
      subject: 'URGENT: Airtable Sync Stale',
      body: `
        Airtable sync has not run successfully for ${health.message}.
        
        Last successful sync: ${health.lastSync}
        
        Action required:
        1. Check Airtable webhook configuration
        2. Verify Airtable API key is valid
        3. Review error logs in Cloudflare Workers dashboard
        4. Consider manual sync if issue persists
        
        The platform is currently operating on cached data from ${health.lastSync}.
      `,
    });
    
    logger.error('Airtable sync health critical', health);
  } else if (health.status === 'warning') {
    logger.warn('Airtable sync health degraded', health);
  }
}
```

**Manual Re-sync Procedure:**

Coordinators can manually trigger a full Airtable re-sync via the admin dashboard:

```typescript
// apps/api/src/routes/coordinator/airtable.ts

/**
 * POST /api/coordinator/airtable/sync
 * Manually trigger full Airtable sync (coordinator-only)
 */
coordinatorRouter.post('/airtable/sync', 
  requireAuth,
  requireRole('coordinator'),
  async (c) => {
    const airtableService = new AirtableService(c.env);
    
    try {
      const result = await airtableService.performFullSync();
      
      return c.json({
        success: true,
        message: 'Airtable sync completed',
        recordsProcessed: result.count,
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Manual Airtable sync failed', { error: error.message });
      
      return c.json({
        success: false,
        error: error.message,
      }, 500);
    }
  }
);
```

**Key Principles:**
- ✅ **Platform remains operational** during Airtable outages using cached data
- ✅ **Transparent degradation** - logs clearly indicate when using cached data
- ✅ **Proactive monitoring** - coordinators alerted if sync stale > 48 hours
- ✅ **Manual recovery** - coordinators can force re-sync via admin dashboard
- ✅ **Automatic recovery** - resumes normal operation when Airtable recovers
- ⚠️ **Acceptable staleness** - up to 24 hours cached data is acceptable per requirements
- ⚠️ **No critical data loss** - booking/availability data lives exclusively in Supabase (unaffected)

---

## 15.8 Error Recovery Patterns

**Retry Logic:**

```typescript
/**
 * Retries an async function with exponential backoff.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Retry attempt ${attempt + 1} failed`, {
        error: lastError.message,
        attempt,
      });

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Usage
const fetchData = async () => {
  return retryWithBackoff(
    () => apiClient.get('/data'),
    3, // Max 3 retries
    1000 // 1 second base delay
  );
};
```

**Graceful Degradation:**

```typescript
// src/features/bookings/BookingsList.tsx

export function BookingsList() {
  const { data: bookings, isLoading, error } = useBookings(user.id);

  // Show cached data if available, even with error
  if (error && !bookings) {
    return (
      <div>
        <ErrorMessage message="Failed to load latest bookings" />
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (error && bookings) {
    // Graceful degradation: show cached data with warning
    return (
      <>
        <Banner variant="warning">
          Showing cached data. Unable to fetch latest bookings.
        </Banner>
        <BookingCards bookings={bookings} />
      </>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <BookingCards bookings={bookings} />;
}
```

---

**Section 15 Complete.** This error handling strategy provides:
- ✅ Frontend error boundaries (global + booking flow)
- ✅ Centralized API client with consistent error handling
- ✅ Error message dictionary for user-friendly messages
- ✅ Custom error classes for backend
- ✅ Error handler middleware for Hono
- ✅ Logging strategy (dev only, toggable in production)
- ✅ Async error handling patterns
- ✅ Form validation error handling
- ✅ External service error handling
- ✅ Error recovery patterns (retry, graceful degradation)

