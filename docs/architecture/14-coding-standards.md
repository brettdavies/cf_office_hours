# 14. Coding Standards

This section defines the coding standards, conventions, and best practices for the CF Office Hours platform. Consistent code style improves readability, maintainability, and collaboration across the development team.

## 14.1 General Principles

**Core Values:**
- **Readability over cleverness** - Write code that's easy to understand
- **Consistency over perfection** - Follow established patterns
- **Explicit over implicit** - Make intentions clear
- **Type safety first** - Leverage TypeScript's type system
- **Fail fast** - Validate early, provide clear error messages

**Code Review Standards:**
- All code changes require PR approval
- PRs should be focused and reviewable (<400 lines changed)
- Self-review before requesting review
- Address all feedback before merging

---

## 14.2 TypeScript Standards

**Type Annotations:**

```typescript
// ✅ Good: Explicit return types for public functions
export const calculateReputationScore = (userId: string): Promise<ReputationScore> => {
  // implementation
};

// ✅ Good: Type parameters for generics
const fetchData = async <T>(endpoint: string): Promise<T> => {
  // implementation
};

// ❌ Avoid: Implicit return types for public functions
export const calculateReputationScore = (userId: string) => {
  // unclear what this returns
};

// ❌ Avoid: Using `any`
const processData = (data: any) => {
  // loses type safety
};
```

**Type Definitions:**

```typescript
// ✅ Good: Interface for object shapes
interface IUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ✅ Good: Type for unions, primitives, or computed types
type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum';
type UserRole = 'mentee' | 'mentor' | 'coordinator';

// ✅ Good: Props interface with I prefix
interface IButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}
```

**Utility Types:**

```typescript
// Use built-in utility types where appropriate
type PartialUser = Partial<IUser>;
type ReadonlyUser = Readonly<IUser>;
type UserWithoutEmail = Omit<IUser, 'email'>;
type UserIdAndName = Pick<IUser, 'id' | 'name'>;
```

**Type Guards:**

```typescript
// ✅ Good: Type guards for runtime checks
const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

## 14.3 File Size & Atomicity

**File Length Guidelines:**

```typescript
// ✅ Good: Focused, single-purpose files
// src/services/reputation-calculator.ts (~150 lines)
export class ReputationCalculator {
  calculateScore(userId: string): Promise<IReputationScore> {
    // Implementation
  }
}

// ❌ Avoid: Large, multi-purpose files
// src/services/booking-service.ts (~800 lines)
// Should be split into: booking-service.ts, booking-validator.ts, booking-notifier.ts, etc.
```

**Guidelines:**
- **Target:** <200 lines of code per file (excluding comments, imports, blank lines)
- **Hard Limit:** Files exceeding 200 lines should be evaluated for refactoring
- **Atomicity:** Each file should have a single, clear responsibility
- **Exceptions:** Complex components or services may exceed 200 lines if they're cohesive and refactoring would reduce clarity

**Refactoring Strategies:**

```typescript
// Before: Large service file (~400 lines)
// src/services/booking-service.ts
export class BookingService {
  async createBooking() { /* 100 lines */ }
  async validateBooking() { /* 80 lines */ }
  async sendNotifications() { /* 60 lines */ }
  async updateCalendar() { /* 80 lines */ }
  // ... more methods
}

// After: Split into focused files
// src/services/booking/booking-service.ts (~120 lines)
// src/services/booking/booking-validator.ts (~80 lines)
// src/services/booking/booking-notifier.ts (~60 lines)
// src/services/booking/calendar-updater.ts (~80 lines)
```

**When to Split:**
- Multiple unrelated responsibilities in one file
- Difficulty naming the file (indicates multiple purposes)
- Frequent merge conflicts (indicates too much activity in one file)
- Hard to understand or navigate
- Many private helper functions (extract to separate utility file)

---

## 14.4 File Organization & Naming

**File Naming Conventions:**

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase.tsx | `UserAvatar.tsx`, `BookingCard.tsx` |
| Hooks | camelCase.ts (prefix: use) | `useAuth.ts`, `useBookings.ts` |
| Utilities | kebab-case.ts | `date-utils.ts`, `string-helpers.ts` |
| Services | kebab-case.ts | `booking-service.ts`, `reputation-calculator.ts` |
| Types | kebab-case.ts | `booking-types.ts`, `user-types.ts` |
| Tests | matches source + .test | `booking-service.test.ts`, `UserAvatar.test.tsx` |
| Constants | kebab-case.ts or SCREAMING_SNAKE_CASE.ts | `api-constants.ts`, `APP_CONFIG.ts` |

**Directory Structure (Frontend):**

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (Button, Input, etc.)
│   ├── booking/         # Booking-specific components
│   ├── profile/         # Profile-specific components
│   └── layout/          # Layout components (Header, Nav, etc.)
├── features/            # Feature-based modules
│   ├── auth/            # Authentication feature
│   ├── bookings/        # Booking feature
│   └── profiles/        # Profile feature
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions, API clients
├── pages/               # Route components
├── types/               # TypeScript type definitions
├── styles/              # Global styles, theme
└── config/              # Configuration files

```

**Directory Structure (Backend):**

```
src/
├── routes/              # API route handlers
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── providers/           # External service providers (calendar, matching, etc.)
├── middleware/          # Hono middleware
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
├── schemas/             # Zod validation schemas
└── config/              # Configuration files
```

**Import Aliases:**

Configure TypeScript path aliases for cleaner imports:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/features/*": ["./src/features/*"]
    }
  }
}
```

---

## 14.5 Import Order & Organization

**Import Grouping (with section headers):**

```typescript
// External dependencies
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

// Internal modules
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { BookingCard } from '@/components/booking/BookingCard';

// Types
import type { IBooking } from '@/types/booking-types';
import type { IUser } from '@/types/user-types';

// Styles
import './BookingList.css';
```

**Import Rules:**
1. Group imports with blank lines and comments
2. Sort alphabetically within each group
3. Prefer named imports over default imports for tree-shaking
4. Avoid relative imports beyond one level (use aliases instead)

```typescript
// ❌ Avoid: Deep relative imports
import { Button } from '../../../components/common/Button';

// ✅ Good: Use path aliases
import { Button } from '@/components/common/Button';
```

---

## 14.6 Naming Conventions

**Variables & Functions:**

```typescript
// ✅ Good: Descriptive, camelCase
const bookingCount = 10;
const isUserActive = true;
const fetchUserProfile = async (userId: string): Promise<IUserProfile> => { /* ... */ };

// ❌ Avoid: Abbreviations, unclear names
const cnt = 10;
const flg = true;
const getData = async (id: string) => { /* ... */ };
```

**Constants:**

```typescript
// ✅ Good: SCREAMING_SNAKE_CASE for true constants
const MAX_BOOKING_LIMIT = 10;
const API_BASE_URL = 'https://api.officehours.youcanjustdothings.io';

// ✅ Good: camelCase for config objects
const appConfig = {
  maxBookingLimit: 10,
  apiBaseUrl: 'https://api.officehours.youcanjustdothings.io',
} as const;
```

**React Components:**

```typescript
// ✅ Good: PascalCase, descriptive names
export const UserProfileCard = ({ user }: IUserProfileCardProps) => {
  // implementation
};

// ✅ Good: Component file matches component name
// File: UserProfileCard.tsx
```

**Custom Hooks:**

```typescript
// ✅ Good: Always prefix with 'use', camelCase
export const useBookings = () => {
  // hook logic
};

export const useAuth = () => {
  // hook logic
};

// ❌ Avoid: Missing 'use' prefix
export const getBookings = () => {
  // this looks like a regular function, not a hook
};
```

**Interfaces & Types:**

```typescript
// ✅ Good: I prefix for interfaces
interface IUser {
  id: string;
  name: string;
}

interface IButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

// ✅ Good: Type for unions, aliases
type UserRole = 'mentee' | 'mentor' | 'coordinator';
type AsyncResult<T> = Promise<T | null>;

// ✅ Good: Enum for related constants (use sparingly, prefer unions)
enum BookingStatus {
  Confirmed = 'confirmed',
  Completed = 'completed',
  Canceled = 'canceled',
}
```

**Boolean Variables:**

```typescript
// ✅ Good: Use is/has/can/should prefixes
const isLoading = false;
const hasPermission = true;
const canBookMentor = false;
const shouldShowBanner = true;

// ❌ Avoid: Unclear boolean names
const loading = false;
const permission = true;
```

**API Routes:**

```typescript
// ✅ Good: Lowercase, kebab-case, RESTful
GET  /api/bookings
POST /api/bookings
GET  /api/bookings/:id
PUT  /api/bookings/:id
DELETE /api/bookings/:id

GET  /api/tier-overrides/requests
POST /api/tier-overrides/:id/approve

// ❌ Avoid: camelCase, unclear structure
GET  /api/getBookings
POST /api/createBooking
```

---

## 14.7 Function Standards

**Function Declarations:**

```typescript
// ✅ Good: Arrow functions with explicit return types
export const calculateReputationScore = async (userId: string): Promise<number> => {
  // implementation
  return score;
};

// ✅ Good: Named function for React components
export function UserProfileCard({ user }: IUserProfileCardProps) {
  return <div>{user.name}</div>;
}

// ✅ Good: Named function for custom hooks
export function useBookings(userId: string) {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  // hook logic
  return { bookings, refetch };
}

// ❌ Avoid: Missing return type for public functions
export const calculateReputationScore = async (userId: string) => {
  return score;
};
```

**Function Length:**
- Keep functions focused (single responsibility)
- Target: <50 lines per function
- If longer, consider extracting helper functions

**Function Parameters:**
- Max 3 parameters; use object destructuring for more
- Required parameters first, optional last

```typescript
// ✅ Good: Object destructuring for multiple params
interface ICreateBookingParams {
  mentorId: string;
  menteeId: string;
  timeSlotId: string;
  meetingGoal: string;
  materialsUrls?: string[];
}

const createBooking = async (params: ICreateBookingParams): Promise<IBooking> => {
  const { mentorId, menteeId, timeSlotId, meetingGoal, materialsUrls } = params;
  // implementation
};

// ❌ Avoid: Too many individual parameters
const createBooking = async (
  mentorId: string,
  menteeId: string,
  timeSlotId: string,
  meetingGoal: string,
  materialsUrls?: string[]
): Promise<IBooking> => {
  // hard to read, easy to mix up order
};
```

---

## 14.8 React Component Standards

**Component Structure:**

```typescript
// External dependencies
import React, { useState, useEffect } from 'react';

// Internal modules
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

// Types
import type { IBooking } from '@/types/booking-types';

// Styles (if component-specific)
import './BookingCard.css';

/**
 * Displays a booking card with meeting details and actions.
 *
 * @param booking - The booking data to display
 * @param onCancel - Callback when cancel button is clicked
 */
interface IBookingCardProps {
  booking: IBooking;
  onCancel?: (bookingId: string) => void;
}

export function BookingCard({ booking, onCancel }: IBookingCardProps) {
  // 1. Hooks (useState, useEffect, custom hooks)
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Effects
  useEffect(() => {
    // side effects
  }, [booking.id]);

  // 3. Event handlers
  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.id);
    }
  };

  // 4. Render logic
  const canCancel = user.id === booking.menteeId || user.id === booking.mentorId;

  // 5. Return JSX
  return (
    <div className="booking-card">
      {/* component content */}
    </div>
  );
}
```

**Component Exports:**

```typescript
// ✅ Good: Named exports for components (better for tree-shaking, refactoring)
export function UserAvatar({ url, name }: IUserAvatarProps) {
  // implementation
}

// ✅ Good: Default export for pages/routes
export default function BookingsPage() {
  // implementation
}
```

**Props Destructuring:**

```typescript
// ✅ Good: Destructure props in function signature
export function Button({ variant, onClick, children, disabled = false }: IButtonProps) {
  // implementation
}

// ❌ Avoid: Using props object directly
export function Button(props: IButtonProps) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

**Conditional Rendering:**

```typescript
// ✅ Good: Early returns for simple conditions
if (!user) {
  return <div>Loading...</div>;
}

// ✅ Good: Ternary for simple inline conditions
{isLoading ? <Spinner /> : <Content />}

// ✅ Good: Logical AND for conditional rendering
{hasError && <ErrorMessage error={error} />}

// ❌ Avoid: Complex nested ternaries
{isLoading ? <Spinner /> : hasError ? <Error /> : hasData ? <Content /> : <Empty />}

// ✅ Better: Extract to variable or early returns
const renderContent = () => {
  if (isLoading) return <Spinner />;
  if (hasError) return <Error />;
  if (!hasData) return <Empty />;
  return <Content />;
};
```

---

## 14.9 Documentation Standards

**JSDoc Comments (Required for Public Functions):**

```typescript
/**
 * Calculates the reputation score for a user based on ratings, completion rate,
 * responsiveness, and tenure.
 *
 * @param userId - The unique identifier of the user
 * @returns A promise that resolves to the calculated reputation score with breakdown
 * @throws {AppError} If user is not found or calculation fails
 *
 * @example
 * ```typescript
 * const score = await calculateReputationScore('user-123');
 * console.log(score.score); // 4.2
 * console.log(score.tier); // 'gold'
 * ```
 */
export const calculateReputationScore = async (userId: string): Promise<IReputationScore> => {
  // implementation
};
```

**Inline Comments (Minimal, for Complex Logic Only):**

```typescript
// ✅ Good: Explain WHY, not WHAT
const calculateReputationScore = async (userId: string): Promise<number> => {
  const ratings = await fetchRatings(userId);
  const averageRating = calculateAverage(ratings);

  // Probationary clamp: New users with <3 ratings cannot drop below 3.5 (per FR48)
  if (ratings.length < 3 && rawScore < 3.5) {
    return 3.5;
  }

  return rawScore;
};

// ❌ Avoid: Stating the obvious
const totalCount = bookings.length; // Get the length of bookings array
if (totalCount > 0) { // Check if totalCount is greater than 0
  // process bookings
}
```

**Component Documentation:**

```typescript
/**
 * Displays a user's reputation score with visual breakdown.
 *
 * Shows the overall score, tier badge, and detailed breakdown of contributing factors:
 * - Average rating from peer reviews
 * - Completion rate (percentage of attended sessions)
 * - Responsiveness factor (booking/cancellation behavior)
 * - Tenure bonus (longevity on platform)
 *
 * @param userId - The user whose reputation to display
 * @param showBreakdown - Whether to show the detailed breakdown (default: true)
 */
interface IReputationDisplayProps {
  userId: string;
  showBreakdown?: boolean;
}

export function ReputationDisplay({ userId, showBreakdown = true }: IReputationDisplayProps) {
  // implementation
}
```

**README Documentation:**
- Every feature module should have a README.md
- Document:
  - Purpose and overview
  - Key files and their roles
  - External dependencies
  - Configuration requirements
  - Testing approach

---

## 14.10 Error Handling Standards

**Error Throwing:**

```typescript
// ✅ Good: Use custom AppError with codes
throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

// ✅ Good: Validate early, fail fast
const createBooking = async (params: ICreateBookingParams): Promise<IBooking> => {
  if (!params.mentorId) {
    throw new AppError(400, 'Mentor ID is required', 'MISSING_MENTOR_ID');
  }

  // continue with logic
};

// ❌ Avoid: Throwing strings
throw 'User not found';

// ❌ Avoid: Silent failures
const user = await fetchUser(userId);
if (!user) {
  return null; // caller won't know what went wrong
}
```

**Try-Catch Usage:**

```typescript
// ✅ Good: Catch at the right level, add context
const fetchUserProfile = async (userId: string): Promise<IUserProfile> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', { userId, error });
    throw new AppError(500, 'Failed to load user profile', 'PROFILE_FETCH_ERROR');
  }
};

// ❌ Avoid: Swallowing errors
try {
  await riskyOperation();
} catch (error) {
  // silent failure
}

// ❌ Avoid: Catching too broadly
try {
  const user = await fetchUser(userId);
  const bookings = await fetchBookings(userId);
  const ratings = await fetchRatings(userId);
  // which one failed?
} catch (error) {
  toast.error('Something went wrong');
}
```

---

## 14.11 Testing Standards

**Test File Naming:**
- Match source file: `booking-service.ts` → `booking-service.test.ts`
- Place tests next to source (preferred) or mirror structure in `__tests__/`

**Test Structure:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateReputationScore } from './reputation-calculator';

describe('calculateReputationScore', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should calculate correct score for new user with probationary clamp', async () => {
    // Arrange
    const userId = 'user-123';
    const mockRatings = [
      { score: 2, raterId: 'user-1' },
      { score: 3, raterId: 'user-2' },
    ];

    // Act
    const result = await calculateReputationScore(userId);

    // Assert
    expect(result.score).toBe(3.5); // Probationary clamp applied
    expect(result.breakdown.isProbationary).toBe(true);
  });

  it('should throw AppError when user not found', async () => {
    // Arrange
    const userId = 'nonexistent';

    // Act & Assert
    await expect(calculateReputationScore(userId)).rejects.toThrow('User not found');
  });
});
```

**Test Coverage Goals:**
- **Unit Tests**: 80%+ coverage for business logic (services, utilities, calculators)
- **Integration Tests**: Critical API endpoints, database operations
- **E2E Tests**: Key user journeys (booking flow, tier override)
- **Component Tests**: Complex stateful components, forms

**What to Test:**
- ✅ Business logic (reputation calculation, matching algorithms)
- ✅ API contracts (request/response validation)
- ✅ Error handling paths
- ✅ Edge cases (empty states, boundary values)
- ❌ Don't test: Implementation details, third-party libraries, trivial getters/setters

---

## 14.12 Performance Best Practices

**Frontend:**

```typescript
// ✅ Good: Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✅ Good: Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ✅ Good: Lazy load route components
const BookingsPage = lazy(() => import('./pages/BookingsPage'));

// ❌ Avoid: Creating objects/functions in render
function MyComponent() {
  return <Child onClick={() => console.log('clicked')} />; // New function every render
}
```

**Backend:**

```typescript
// ✅ Good: Use database indexes for common queries
// In migration:
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_time_slots_mentor_start ON time_slots(mentor_id, start_time);

// ✅ Good: Batch database operations
const users = await db.from('users').select('*').in('id', userIds);

// ❌ Avoid: N+1 queries
for (const booking of bookings) {
  const user = await db.from('users').select('*').eq('id', booking.userId).single();
}
```

---

## 14.13 Security Best Practices

**Input Validation:**

```typescript
// ✅ Good: Validate all inputs with Zod
const CreateBookingSchema = z.object({
  mentorId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  meetingGoal: z.string().min(10).max(1000),
});

// ✅ Good: Sanitize user input before rendering
import DOMPurify from 'dompurify';
const sanitizedContent = DOMPurify.sanitize(userInput);
```

**Authentication & Authorization:**

```typescript
// ✅ Good: Check auth on every protected endpoint
app.get('/api/bookings/:id', requireAuth, async (c) => {
  const user = c.get('user');
  // implementation
});

// ✅ Good: Validate user can access resource
const booking = await getBooking(bookingId);
if (booking.menteeId !== user.id && booking.mentorId !== user.id && user.role !== 'coordinator') {
  throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
}
```

**Environment Variables:**

```typescript
// ✅ Good: Validate environment variables at startup
const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
});

const env = envSchema.parse(process.env);

// ❌ Avoid: Using process.env directly without validation
const supabaseUrl = process.env.SUPABASE_URL; // Could be undefined
```

---

## 14.14 Accessibility Standards

**Semantic HTML:**

```tsx
// ✅ Good: Use semantic HTML elements
<nav>
  <ul>
    <li><a href="/bookings">My Bookings</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Booking Details</h1>
  </article>
</main>

// ❌ Avoid: Divs for everything
<div className="nav">
  <div className="link">My Bookings</div>
</div>
```

**ARIA Labels:**

```tsx
// ✅ Good: Add labels for screen readers
<button
  aria-label="Cancel booking with John Doe on March 15"
  onClick={handleCancel}
>
  <X /> {/* Icon only */}
</button>

// ✅ Good: Use aria-describedby for additional context
<input
  id="meeting-goal"
  aria-describedby="meeting-goal-help"
/>
<p id="meeting-goal-help">Describe what you'd like to discuss (min 10 characters)</p>
```

**Keyboard Navigation:**

```tsx
// ✅ Good: Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

## 14.15 Git Commit Standards

**Commit Message Format:**

```
type(scope): summary

Description (optional)

- Additional details
- Related changes

Refs: #issue-number
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting (no functional changes)
- `refactor`: Code refactoring (no functional changes)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

**Examples:**

```
feat(booking): add real-time slot availability updates

Implement Supabase Realtime subscription for time_slots table.
Slots now disappear immediately when booked by another user.

- Add useRealtimeSlots hook
- Update SlotPicker component to subscribe to changes
- Add toast notification for concurrent booking attempts

Refs: #42

---

fix(reputation): apply probationary clamp for new users

New users with <3 ratings cannot drop below 3.5 score.

Refs: #67

---

refactor(api): extract auth middleware to separate module

- Move requireAuth to middleware/auth.ts
- Add requireRole helper for RBAC
- Update all routes to use new middleware

Refs: #89
```

**Commit Best Practices:**
- Commit often (logical chunks of work)
- Write clear, descriptive messages
- Reference related issues/PRs
- Keep commits focused (one concern per commit)
- Use present tense ("add feature" not "added feature")

---

## 14.16 Code Review Checklist

**Before Submitting PR:**
- [ ] Code follows style guide and conventions
- [ ] All tests pass locally
- [ ] No linter errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Added/updated tests for new functionality
- [ ] Updated relevant documentation
- [ ] Self-reviewed code for obvious issues
- [ ] Checked for sensitive data (no secrets committed)

**For Reviewers:**
- [ ] Code is readable and maintainable
- [ ] Logic is sound and follows requirements
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities introduced
- [ ] Performance considerations addressed
- [ ] Breaking changes are documented

---

**Section 14 Complete.** This coding standards guide provides:
- ✅ TypeScript standards (types, interfaces, utility types)
- ✅ File size guidelines (<200 lines of code per file, atomicity principles)
- ✅ File organization and naming conventions
- ✅ Import order with section headers
- ✅ Function and component standards
- ✅ Documentation requirements (JSDoc, inline comments)
- ✅ Error handling patterns
- ✅ Testing standards and coverage goals
- ✅ Performance best practices
- ✅ Security best practices
- ✅ Accessibility standards
- ✅ Git commit conventions
- ✅ Code review checklist

