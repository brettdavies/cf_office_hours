# 15. Error Handling Strategy

This document describes how the Office Hours platform handles errors end to end: the backend's single error type and
global handler, the structured response contract, request logging, how non-critical external services degrade, and how
the web client consumes and presents errors.

## 15.1 Philosophy

- **One error type, one handler.** Backend code throws a single `AppError`; one Hono `onError` handler turns every
  thrown error into the same JSON shape. Routes and services never format error responses themselves.
- **Fail fast on misconfiguration.** Missing infrastructure (for example, the `DB` binding) throws immediately at access
  time rather than failing deep in a request.
- **Degrade, don't crash, on non-critical dependencies.** Optional external services (OpenAI, email) catch their own
  failures and fall back — a booking still succeeds if the confirmation email cannot be sent, and matching still returns
  if the AI scorer is unavailable.
- **Structured, correlatable output.** Every error response and every request log is JSON with a timestamp, so failures
  can be traced in `wrangler tail`.

## 15.2 Backend Error Handling

### 15.2.1 The `AppError` class

`src/lib/errors.ts` defines the one error type the backend throws. There is no subclass hierarchy and no factory helpers
— services construct it directly:

```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}
```

- `statusCode` — the HTTP status to return (400, 401, 403, 404, 409, 500).
- `code` — a machine-readable identifier the client maps to a user-facing message.
- `details` — optional structured context (for example, `{ requiredRole, actualRole }`).

### 15.2.2 The global error handler

`src/middleware/error-handler.ts` is registered via `app.onError(errorHandler)` and handles three cases:

1. **`AppError`** → responds with `err.statusCode`, echoing `code`, `message`, and any `details`.
2. **`ZodError`** (request validation) → `400` with code `VALIDATION_ERROR` and the Zod issues under `details.issues`.
   Validation relies on Hono's default behavior; there is no custom `zod-openapi` hook.
3. **Unknown errors** → `500` with code `INTERNAL_ERROR`.

Every response uses the same envelope, and the handler logs the error before responding:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot is no longer available",
    "details": {},
    "timestamp": "2026-06-27T12:34:56.789Z"
  }
}
```

### 15.2.3 Error codes

Codes are thrown by services and the auth middleware. The common ones:

| Code                                                                                             | Status | Raised when                                                        |
| ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`                                                                               | 400    | Request body/query/params fail Zod validation                      |
| `INVALID_MEETING_TYPE`                                                                           | 400    | A meeting type other than the supported value is supplied          |
| `UNAUTHORIZED`                                                                                   | 401    | Missing or invalid session JWT                                     |
| `FORBIDDEN`                                                                                      | 403    | Email not in the allowlist, or role does not satisfy `requireRole` |
| `NOT_FOUND` / `USER_NOT_FOUND` / `SLOT_NOT_FOUND` / `AVAILABILITY_NOT_FOUND` / `MATCH_NOT_FOUND` | 404    | A referenced resource does not exist                               |
| `SLOT_UNAVAILABLE`                                                                               | 409    | A slot was booked between read and write (race)                    |
| `DATABASE_ERROR` / `CREATION_FAILED` / `FETCH_FAILED` / `UPDATE_FAILED`                          | 500    | A D1 operation failed                                              |
| `INTERNAL_ERROR`                                                                                 | 500    | Catch-all for unhandled errors                                     |

### 15.2.4 Throwing from services

Services translate failed invariants into `AppError`; the route handler stays thin and lets the error propagate to the
global handler:

```ts
const slot = await this.bookingRepo.getTimeSlot(slotId);
if (!slot) throw new AppError(404, 'Time slot not found', 'SLOT_NOT_FOUND');
if (slot.is_booked) throw new AppError(409, 'This time slot is no longer available', 'SLOT_UNAVAILABLE');
```

## 15.3 Logging

`src/middleware/logging.ts` emits one JSON line when a request arrives and one when it completes, via `console.*` (which
Cloudflare surfaces in `wrangler tail` and the dashboard). Fields include `method`, `path`, the authenticated `userId`
(or `anonymous`), and, on completion, `statusCode` and `duration`. The global error handler logs the error as its first
action so a failed request produces both a request log and an error log correlated by timestamp.

## 15.4 External Service Error Handling

Optional dependencies never propagate failures into the request that triggered them.

- **OpenAI (AI matching engine).** `providers/matching/ai-based.engine.ts` wraps each call in try/catch with a 10-second
  abort timeout. On any failure — missing key, network error, rate limit, timeout, bad JSON — it logs and returns a
  score of `0` rather than throwing. Matching therefore continues to work (with reduced signal) when OpenAI is
  unavailable or `OPENAI_API_KEY` is unset.
- **Email (Resend).** `services/notification.service.ts` wraps sending in try/catch and currently logs the formatted
  message to the console (Resend delivery is deferred). A send failure is logged and swallowed; it never blocks the
  booking that triggered it.
- **Calendar.** No calendar integration exists yet, so there is no calendar error path.

There is no Airtable or Supabase integration. The only residue of the prior data source is the unused
`users.airtable_record_id` column (see [8.8 Data Model](./8-backend-architecture.md#88-data-model)); no code calls
Airtable or Supabase.

## 15.5 Asynchronous & Fire-and-Forget Errors

Match recalculation runs outside the request's critical path. The event handlers in `events/matching-triggers.ts` are
wrapped in `withErrorHandling()` and invoked without `await` (with a `.catch`), so a recalculation failure is logged but
never affects the response the user receives. This keeps a slow or failing background recompute from turning a
successful profile update into a request error.

## 15.6 Frontend Error Handling

### 15.6.1 The API client

`apps/web/src/lib/api-client.ts` is a typed wrapper over `fetch` that centralizes error handling:

- **Non-2xx responses** are parsed as the backend envelope; if the body cannot be parsed it falls back to `{ error: {
  code: 'UNKNOWN_ERROR', message: 'An error occurred' } }`.
- **`403 Forbidden`** is treated as an expired/invalid session: the client logs out and hard-redirects to `/auth/login`.
- **Other failures** throw an `ApiError(statusCode, code, message, details?)` for the caller to handle.
- **In-flight deduplication:** identical concurrent requests (keyed by method, endpoint, and body) share one promise.

```ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}
```

### 15.6.2 Error message dictionary

`apps/web/src/lib/error-messages.ts` maps backend `code` values to user-facing copy. `getErrorMessage(code, fallback)`
returns the mapped message, or the fallback (defaulting to a generic internal-error message) when a code is unmapped.
Components catch `ApiError`, render the message, and surface it through component or hook state.

### 15.6.3 No global error boundary

There is currently no React error boundary. API failures are handled at the call site (via `ApiError` and component
state), but an uncaught render error is not caught by a boundary. Adding a top-level `ErrorBoundary` with a fallback UI
is the natural next step for resilience.

## 15.7 Error Recovery Patterns

- **Booking race condition.** Slot availability is re-checked at write time; if the slot was taken between read and
  write, the service throws `409 SLOT_UNAVAILABLE` and the client shows a "slot no longer available" message rather than
  double-booking.
- **Session expiry.** A `403` from any endpoint drives the client through logout and back to login, so a stale token
  resolves to a clean re-auth instead of repeated failures.
- **Request deduplication.** Concurrent identical reads collapse to a single request, avoiding redundant load and
  inconsistent partial states.
- **Graceful AI degradation.** A failed AI score contributes `0` instead of failing the matching response, so the
  feature stays available during an OpenAI outage.
