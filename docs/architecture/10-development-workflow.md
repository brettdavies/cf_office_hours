# 10. Development Workflow

This section covers the complete development workflow, from initial setup through code review and collaboration practices. It provides practical guidance for developers working on the CF Office Hours platform.

## 10.1 Initial Development Setup

**Prerequisites:**
- Node.js 20.x or higher
- npm 10.x or higher
- Git
- VS Code (recommended) or preferred IDE
- Cloudflare account (for deployment)
- Supabase account (for database)

**Setup Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/capital-factory/cf-office-hours.git
cd cf-office-hours

# 2. Run automated setup script
npm run setup

# This script will:
# - Copy .env.example to .env for each app
# - Install all dependencies
# - Set up git hooks (if configured)

# 3. Configure environment variables
# Edit apps/web/.env with your Supabase and API URLs
# Edit apps/api/.env with your service keys and secrets

# 4. Start Supabase locally (optional)
npx supabase init
npx supabase start

# 5. Run database migrations
npx supabase db push

# 6. Seed development data (optional)
npm run seed

# 7. Start development servers
npm run dev

# This starts both:
# - Frontend: http://localhost:3000
# - API: http://localhost:8787
```

**Verifying Setup:**

```bash
# Check all packages are installed
npm list --workspaces

# Type check all code
npm run type-check

# Run linter
npm run lint

# Run tests
npm run test
```

## 10.2 Local Development

**Starting Development Servers:**

```bash
# Start all services (frontend + backend)
npm run dev

# Or start individually:
npm run dev:web    # Frontend only on http://localhost:3000
npm run dev:api    # Backend only on http://localhost:8787

# Tail API logs
npm run tail --workspace=apps/api
```

**Hot Module Replacement (HMR):**
- Frontend: Vite provides instant HMR for React components
- Backend: Wrangler automatically reloads on file changes
- Shared package changes: Workspaces automatically detect changes

**Using Local Supabase:**

```bash
# Start local Supabase (optional for development)
npx supabase start

# Access local services:
# - Studio: http://localhost:54323
# - API: http://localhost:54321
# - Database: postgresql://postgres:postgres@localhost:54322/postgres

# Stop Supabase
npx supabase stop
```

## 10.3 Testing Practices

**Unit Testing (Vitest):**

```bash
# Run all unit tests
npm run test

# Run tests for specific workspace
npm run test:web
npm run test:api

# Watch mode for TDD
npm run test:watch --workspace=apps/web

# Run with coverage
npm run test -- --coverage
```

**Example Unit Test:**
```typescript
// apps/api/src/services/booking.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  
  beforeEach(() => {
    service = new BookingService(mockEnv);
  });

  it('should create booking when all validations pass', async () => {
    // Arrange
    const menteeId = 'test-mentee-id';
    const bookingData = { /* ... */ };
    
    // Act
    const result = await service.createBooking(menteeId, bookingData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.status).toBe('confirmed');
  });
});
```

**Component Testing:**

```bash
# Run component tests with Testing Library
npm run test:web

# Watch mode
npm run test:watch --workspace=apps/web
```

**Example Component Test:**
```typescript
// apps/web/src/components/common/UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('displays initials when no avatar URL provided', () => {
    render(<UserAvatar user={{ name: 'John Doe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
```

**End-to-End Testing (Playwright):**

```bash
# Run E2E tests headless
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui --workspace=apps/web

# Debug specific test
npx playwright test booking-flow --debug
```

**Example E2E Test:**
```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/mentors');
  await page.click('[data-testid="mentor-card-first"] >> text=Book Now');
  await page.click('[data-testid="time-slot-button"]:not([disabled]):first');
  await page.fill('[name="meeting_goal"]', 'Discuss product-market fit');
  await page.click('text=Confirm Booking');
  await expect(page.locator('text=Booking Confirmed')).toBeVisible();
});
```

## 10.4 Debugging Strategies

**Frontend Debugging:**

1. **React DevTools:**
   - Install React DevTools browser extension
   - Inspect component tree, props, and state
   - Profile component re-renders

2. **React Query DevTools:**
   ```typescript
   // Already configured in apps/web/src/App.tsx
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   
   // Visible in development only
   {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
   ```

3. **VS Code Debugger:**
   ```json
   // .vscode/launch.json
   {
     "type": "chrome",
     "request": "launch",
     "name": "Debug Frontend",
     "url": "http://localhost:3000",
     "webRoot": "${workspaceFolder}/apps/web/src"
   }
   ```

4. **Console Logging:**
   ```typescript
   // Use structured logging
   console.log('[BookingForm]', { selectedSlot, formData });
   ```

**Backend Debugging:**

1. **Wrangler Tail (Live Logs):**
   ```bash
   npm run tail --workspace=apps/api
   
   # Filter logs
   wrangler tail --format json | grep "error"
   ```

2. **Local Workers Inspector:**
   - Wrangler dev automatically enables DevTools
   - Access at: `chrome://inspect`

3. **Console Logging:**
   ```typescript
   // Structured logging in Workers
   console.log({
     event: 'booking_created',
     bookingId: booking.id,
     mentorId: mentor.id,
     menteeId: mentee.id,
   });
   ```

4. **Request/Response Inspection:**
   ```typescript
   // Log incoming requests
   app.use('*', async (c, next) => {
     console.log(`${c.req.method} ${c.req.url}`);
     await next();
   });
   ```

**Database Debugging:**

1. **Supabase Studio:**
   - Access: https://app.supabase.com (production)
   - Or: http://localhost:54323 (local)
   - Browse tables, run SQL queries, view logs

2. **SQL Query Logging:**
   ```typescript
   // Enable query logging in development
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     global: {
       headers: { 'x-my-custom-header': 'debug' },
     },
   });
   ```

## 10.5 Code Quality & Standards

**Pre-commit Checks:**

```bash
# Run before committing
npm run lint        # ESLint
npm run format      # Prettier
npm run type-check  # TypeScript
npm run test        # All tests
```

**Linting:**

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Lint specific file
npx eslint apps/web/src/components/UserCard.tsx
```

**Formatting:**

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Format specific directory
npx prettier --write "apps/web/src/components/**/*.tsx"
```

**Type Checking:**

```bash
# Check all packages
npm run type-check

# Check specific workspace
npx tsc --noEmit --project apps/web/tsconfig.json
```

## 10.6 Git Workflow

**Branch Strategy:**

```bash
# Main branches
main        # Production-ready code
develop     # Integration branch for features

# Feature branches
feature/booking-flow
feature/calendar-integration
fix/booking-race-condition
docs/api-documentation
```

**Creating a Feature Branch:**

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/mentor-ratings

# Work on your feature...
git add .
git commit -m "feat(ratings): implement mentor rating component"

# Push to remote
git push origin feature/mentor-ratings
```

**Commit Message Format:**

Follow conventional commits format. See **Section 14.15 (Git Commit Standards)** for detailed commit message format, types, and examples.

## 10.7 Pull Request Process

**Creating a Pull Request:**

1. **Ensure Branch is Up-to-Date:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature
   git merge develop
   # Resolve any conflicts
   ```

2. **Run Quality Checks:**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

3. **Push and Create PR:**
   ```bash
   git push origin feature/your-feature
   # Create PR on GitHub
   ```

**PR Template:**

```markdown
# Description
Brief description of the changes and why they're needed.

# Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

# Related Issues
Closes #123

# How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

# Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing

# Screenshots (if applicable)
[Add screenshots for UI changes]
```

**Code Review Guidelines:**

**For Authors:**
- Keep PRs focused and reasonably sized (<500 lines)
- Write clear descriptions and link related issues
- Respond to feedback promptly
- Run all checks before requesting review

**For Reviewers:**
- Review within 24 hours if possible
- Focus on logic, architecture, and maintainability
- Be constructive and specific in feedback
- Approve when ready, request changes if needed

## 10.8 Troubleshooting Common Issues

**Issue: Port Already in Use**

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev:web
```

**Issue: Module Not Found**

```bash
# Clear node_modules and reinstall
npm run clean
npm install

# Clear build cache
rm -rf apps/web/node_modules/.vite
rm -rf apps/api/.wrangler
```

**Issue: TypeScript Errors After Update**

```bash
# Regenerate TypeScript build info
npm run type-check

# Clear TypeScript cache
rm -rf apps/*/tsconfig.tsbuildinfo
```

**Issue: Supabase Connection Fails**

```bash
# Check environment variables
cat apps/web/.env | grep SUPABASE
cat apps/api/.env | grep SUPABASE

# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

**Issue: Wrangler Authentication**

```bash
# Login to Cloudflare
npx wrangler login

# Verify authentication
npx wrangler whoami
```

## 10.9 Performance Profiling

**Frontend Performance:**

1. **React DevTools Profiler:**
   - Enable profiling in React DevTools
   - Record interaction
   - Analyze component render times

2. **Lighthouse:**
   ```bash
   # Run Lighthouse audit
   npx lighthouse http://localhost:3000 --view
   ```

3. **Bundle Analysis:**
   ```bash
   # Analyze bundle size
   npm run build:web
   npx vite-bundle-visualizer apps/web/dist/stats.html
   ```

**Backend Performance:**

1. **Worker Analytics:**
   - View in Cloudflare dashboard
   - Monitor request rates, errors, CPU time

2. **Profiling with console.time:**
   ```typescript
   console.time('database-query');
   const users = await userRepo.findAll();
   console.timeEnd('database-query');
   ```

## 10.10 Documentation Practices

**Code Documentation:**

```typescript
/**
 * Creates a new booking after validating tier restrictions and calendar conflicts.
 * 
 * @param menteeId - UUID of the mentee making the booking
 * @param data - Booking request data including time slot and meeting goal
 * @returns Promise resolving to the created booking with participant details
 * 
 * @throws {ApiError} CALENDAR_NOT_CONNECTED if mentee calendar not connected
 * @throws {ApiError} TIER_RESTRICTION if mentee tier too low for mentor
 * @throws {ApiError} CALENDAR_CONFLICT if time conflicts with existing event
 * 
 * @example
 * const booking = await bookingService.createBooking('mentee-id', {
 *   time_slot_id: 'slot-123',
 *   meeting_goal: 'Discuss product-market fit strategy',
 * });
 */
async createBooking(menteeId: string, data: CreateBookingRequest): Promise<Booking> {
  // Implementation
}
```

**API Documentation:**

API documentation is auto-generated from OpenAPI spec:
- Access Swagger UI: http://localhost:8787/api/docs
- OpenAPI JSON: http://localhost:8787/api/openapi.json

**Architecture Documentation:**

Update this architecture document when making significant changes:
- Data model changes
- New API endpoints
- Architecture decisions
- Technology updates

## 10.11 Collaboration Best Practices

**Communication:**
- Use PR comments for code-specific discussions
- Use issue tracker for feature planning and bug tracking
- Use Slack/Discord for quick questions
- Document decisions in architecture docs

**Pair Programming:**
- Use VS Code Live Share for remote pairing
- Share screens for complex debugging
- Rotate pairs regularly

**Knowledge Sharing:**
- Write clear commit messages
- Document complex logic with comments
- Update README when workflows change
- Conduct code reviews as learning opportunities

**Conflict Resolution:**
```bash
# Fetch latest changes
git fetch origin

# View conflicts
git diff origin/develop

# Merge and resolve
git merge origin/develop
# Resolve conflicts in VS Code
git add .
git commit -m "merge: resolve conflicts with develop"
```

---

