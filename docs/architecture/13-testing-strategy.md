# 13. Testing Strategy

This section outlines the comprehensive testing approach for the CF Office Hours platform, covering unit testing, integration testing, end-to-end testing, and testing best practices.

## 13.1 Testing Philosophy

**Testing Pyramid:**
```
              /\
             /  \
            / E2E \          (Few - High value, slow)
           /------\
          /  Inte- \
         / gration  \        (Some - Medium value, medium speed)
        /------------\
       /              \
      /  Unit Tests    \     (Many - Fast, focused)
     /------------------\
```

**Testing Principles:**
1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Write tests first when fixing bugs** - Reproduce the bug, then fix it
3. **Keep tests simple and readable** - Tests are documentation
4. **Test the happy path and edge cases** - Cover success and failure scenarios
5. **Use meaningful test names** - Describe what is being tested
6. **Keep tests isolated** - Each test should be independent

**Test Coverage Goals:**
- **Unit Tests:** >80% code coverage
- **Integration Tests:** Cover all API endpoints
- **E2E Tests:** Cover critical user journeys
- **Total Coverage:** Aim for >75% overall

## 13.2 Unit Testing (Vitest)

**Setup:**

```typescript
// vitest.config.ts (workspace root)
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Unit Test Examples:**

**1. Testing Utilities:**

```typescript
// apps/api/src/utils/reputation.test.ts
import { describe, it, expect } from 'vitest';
import { calculateReputationScore, determineTier } from './reputation';

describe('Reputation Calculator', () => {
  describe('calculateReputationScore', () => {
    it('should calculate score correctly for user with ratings', () => {
      const user = {
        totalRatings: 10,
        averageRating: 4.5,
        completionRate: 0.9,
        responseTime: '12h',
        tenureMonths: 6,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBeCloseTo(4.86, 2); // (4.5 × 0.9 × 1.2) + 0.6
      expect(result.breakdown.averageRating).toBe(4.5);
      expect(result.breakdown.completionRate).toBe(0.9);
      expect(result.breakdown.responsivenessFactor).toBe(1.2);
      expect(result.breakdown.tenureBonus).toBe(0.6);
    });
    
    it('should apply probationary clamp for new users', () => {
      const user = {
        totalRatings: 2, // Less than 3
        averageRating: 3.0,
        completionRate: 0.8,
        responseTime: '48h',
        tenureMonths: 1,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBe(3.5); // Clamped to 3.5
      expect(result.breakdown.isProbationary).toBe(true);
    });
    
    it('should not clamp probationary users with high scores', () => {
      const user = {
        totalRatings: 2,
        averageRating: 5.0,
        completionRate: 1.0,
        responseTime: '6h',
        tenureMonths: 1,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBeGreaterThan(3.5);
      expect(result.breakdown.isProbationary).toBe(false);
    });
  });
  
  describe('determineTier', () => {
    it('should assign correct tiers based on score', () => {
      expect(determineTier(2.5)).toBe('bronze');
      expect(determineTier(3.0)).toBe('silver');
      expect(determineTier(3.5)).toBe('silver');
      expect(determineTier(4.0)).toBe('gold');
      expect(determineTier(4.5)).toBe('platinum');
      expect(determineTier(5.0)).toBe('platinum');
    });
  });
});
```

**2. Testing Services:**

```typescript
// apps/api/src/services/booking.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let mockRepository: any;
  let mockCalendarProvider: any;
  
  beforeEach(() => {
    mockRepository = {
      findSlotById: vi.fn(),
      createBooking: vi.fn(),
      getUserById: vi.fn(),
    };
    
    mockCalendarProvider = {
      checkConflicts: vi.fn(),
      createEvent: vi.fn(),
    };
    
    service = new BookingService(mockRepository, mockCalendarProvider);
  });
  
  describe('createBooking', () => {
    it('should create booking when all validations pass', async () => {
      // Arrange
      const menteeId = 'mentee-123';
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Discuss product-market fit',
      };
      
      const mockSlot = {
        id: 'slot-123',
        mentor_id: 'mentor-123',
        is_booked: false,
        start_time: new Date('2025-10-10T14:00:00Z'),
        end_time: new Date('2025-10-10T14:30:00Z'),
      };
      
      const mockMentee = { id: menteeId, reputation_tier: 'silver' };
      const mockMentor = { id: 'mentor-123', reputation_tier: 'gold' };
      
      mockRepository.findSlotById.mockResolvedValue(mockSlot);
      mockRepository.getUserById
        .mockResolvedValueOnce(mockMentee)
        .mockResolvedValueOnce(mockMentor);
      mockCalendarProvider.checkConflicts.mockResolvedValue(false);
      mockRepository.createBooking.mockResolvedValue({
        id: 'booking-123',
        ...bookingData,
        status: 'confirmed',
      });
      
      // Act
      const result = await service.createBooking(menteeId, bookingData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(mockCalendarProvider.checkConflicts).toHaveBeenCalledWith(
        mockMentor.id,
        mockSlot.start_time,
        mockSlot.end_time
      );
      expect(mockRepository.createBooking).toHaveBeenCalled();
    });
    
    it('should throw error if slot is already booked', async () => {
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Test',
      };
      
      mockRepository.findSlotById.mockResolvedValue({
        id: 'slot-123',
        is_booked: true,
      });
      
      await expect(
        service.createBooking('mentee-123', bookingData)
      ).rejects.toThrow('Slot is already booked');
    });
    
    it('should throw error if calendar conflict detected', async () => {
      const mockSlot = {
        id: 'slot-123',
        mentor_id: 'mentor-123',
        is_booked: false,
        start_time: new Date('2025-10-10T14:00:00Z'),
        end_time: new Date('2025-10-10T14:30:00Z'),
      };
      
      mockRepository.findSlotById.mockResolvedValue(mockSlot);
      mockRepository.getUserById.mockResolvedValue({ reputation_tier: 'silver' });
      mockCalendarProvider.checkConflicts.mockResolvedValue(true);
      
      await expect(
        service.createBooking('mentee-123', { time_slot_id: 'slot-123', meeting_goal: 'Test' })
      ).rejects.toThrow('Calendar conflict detected');
    });
  });
});
```

**3. Testing React Components:**

```typescript
// apps/web/src/components/common/UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders avatar image when URL is provided', () => {
    const user = {
      name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    };
    
    render(<UserAvatar user={user} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', user.avatar_url);
    expect(img).toHaveAttribute('alt', user.name);
  });
  
  it('renders initials when no avatar URL provided', () => {
    const user = {
      name: 'John Doe',
      avatar_url: null,
    };
    
    render(<UserAvatar user={user} />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
  
  it('renders single letter for single-word names', () => {
    const user = {
      name: 'Madonna',
      avatar_url: null,
    };
    
    render(<UserAvatar user={user} />);
    
    expect(screen.getByText('M')).toBeInTheDocument();
  });
  
  it('applies correct size class', () => {
    const user = { name: 'John Doe' };
    
    const { container } = render(<UserAvatar user={user} size="lg" />);
    
    const avatar = container.firstChild;
    expect(avatar).toHaveClass('h-12', 'w-12');
  });
});
```

**4. Testing React Hooks:**

```typescript
// apps/web/src/hooks/useBookings.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookings, useCreateBooking } from './useBookings';
import * as api from '../lib/api';

// Mock API
vi.mock('../lib/api');

describe('useBookings', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('fetches bookings successfully', async () => {
    const mockBookings = [
      { id: '1', mentor_id: 'mentor-1', status: 'confirmed' },
      { id: '2', mentor_id: 'mentor-2', status: 'confirmed' },
    ];
    
    vi.mocked(api.fetchMyBookings).mockResolvedValue(mockBookings);
    
    const { result } = renderHook(() => useBookings(), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toEqual(mockBookings);
  });
  
  it('handles fetch error gracefully', async () => {
    vi.mocked(api.fetchMyBookings).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useBookings(), { wrapper });
    
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    expect(result.current.error).toBeDefined();
  });
});
```

## 13.3 Integration Testing

**API Integration Tests:**

```typescript
// apps/api/src/routes/bookings.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, createTestUser, createTestSlot } from '../test-utils';

describe('Bookings API', () => {
  let app: Hono;
  let testUser: User;
  let authToken: string;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  beforeEach(async () => {
    // Create test user and get auth token
    testUser = await createTestUser({ role: 'mentee' });
    authToken = await getAuthToken(testUser.id);
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  describe('POST /api/bookings', () => {
    it('creates booking successfully with valid data', async () => {
      // Arrange
      const mentor = await createTestUser({ role: 'mentor' });
      const slot = await createTestSlot({ mentor_id: mentor.id });
      
      const bookingData = {
        time_slot_id: slot.id,
        meeting_goal: 'Discuss product-market fit strategy for SaaS startup',
      };
      
      // Act
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      // Assert
      expect(response.status).toBe(201);
      
      const booking = await response.json();
      expect(booking).toMatchObject({
        time_slot_id: slot.id,
        mentee_id: testUser.id,
        mentor_id: mentor.id,
        status: 'confirmed',
      });
    });
    
    it('returns 400 for invalid meeting goal', async () => {
      const slot = await createTestSlot();
      
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: slot.id,
          meeting_goal: 'Too short', // Less than 10 characters
        }),
      });
      
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('returns 409 if slot is already booked', async () => {
      const slot = await createTestSlot({ is_booked: true });
      
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: slot.id,
          meeting_goal: 'Test meeting goal that is long enough',
        }),
      });
      
      expect(response.status).toBe(409);
      const error = await response.json();
      expect(error.error.code).toBe('SLOT_UNAVAILABLE');
    });
    
    it('returns 401 without authentication', async () => {
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: 'slot-123',
          meeting_goal: 'Test',
        }),
      });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/bookings/my-bookings', () => {
    it('returns user bookings', async () => {
      // Create test bookings
      await createTestBooking({ mentee_id: testUser.id });
      await createTestBooking({ mentee_id: testUser.id });
      
      const response = await app.request('/api/bookings/my-bookings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(200);
      
      const bookings = await response.json();
      expect(bookings).toHaveLength(2);
      expect(bookings[0].mentee_id).toBe(testUser.id);
    });
  });
});
```

**Database Integration Tests:**

```typescript
// apps/api/src/repositories/booking.repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BookingRepository } from './booking.repository';
import { createTestDatabase, cleanupTestDatabase } from '../test-utils';

describe('BookingRepository', () => {
  let repository: BookingRepository;
  let db: SupabaseClient;
  
  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new BookingRepository(db);
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(db);
  });
  
  describe('create', () => {
    it('creates booking with all fields', async () => {
      const bookingData = {
        time_slot_id: 'slot-123',
        mentor_id: 'mentor-123',
        mentee_id: 'mentee-123',
        meeting_goal: 'Test meeting',
        status: 'confirmed' as const,
      };
      
      const booking = await repository.create(bookingData);
      
      expect(booking).toMatchObject(bookingData);
      expect(booking.id).toBeDefined();
      expect(booking.created_at).toBeDefined();
    });
    
    it('marks time slot as booked', async () => {
      const slot = await createTestSlot({ is_booked: false });
      
      await repository.create({
        time_slot_id: slot.id,
        mentor_id: 'mentor-123',
        mentee_id: 'mentee-123',
        meeting_goal: 'Test',
        status: 'confirmed',
      });
      
      const updatedSlot = await db
        .from('time_slots')
        .select('is_booked')
        .eq('id', slot.id)
        .single();
      
      expect(updatedSlot.is_booked).toBe(true);
    });
  });
  
  describe('findByUserId', () => {
    it('returns bookings for mentee', async () => {
      const menteeId = 'mentee-123';
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: 'other-mentee' });
      
      const bookings = await repository.findByUserId(menteeId);
      
      expect(bookings).toHaveLength(2);
      expect(bookings.every(b => b.mentee_id === menteeId)).toBe(true);
    });
    
    it('returns bookings for mentor', async () => {
      const mentorId = 'mentor-123';
      await createTestBooking({ mentor_id: mentorId });
      await createTestBooking({ mentor_id: 'other-mentor' });
      
      const bookings = await repository.findByUserId(mentorId);
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].mentor_id).toBe(mentorId);
    });
    
    it('excludes soft-deleted bookings', async () => {
      const menteeId = 'mentee-123';
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: menteeId, deleted_at: new Date() });
      
      const bookings = await repository.findByUserId(menteeId);
      
      expect(bookings).toHaveLength(1);
    });
  });
});
```

## 13.4 End-to-End Testing (Playwright)

**Playwright Configuration:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test Examples:**

```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as mentee
    await page.goto('/login');
    await page.fill('[name="email"]', 'mentee@test.com');
    await page.click('button:has-text("Send Magic Link")');
    
    // Mock magic link authentication (or use test user)
    await page.goto('/auth/callback?token=test-token');
  });
  
  test('complete booking flow end-to-end', async ({ page }) => {
    // Navigate to mentor directory
    await page.goto('/mentors');
    await expect(page.locator('h1')).toContainText('Find Mentors');
    
    // Search for mentor
    await page.fill('[placeholder="Search mentors..."]', 'Product Strategy');
    await page.waitForSelector('[data-testid="mentor-card"]');
    
    // Click on first mentor
    await page.click('[data-testid="mentor-card"]:first-child');
    await expect(page).toHaveURL(/\/mentors\/.+/);
    
    // Click Book Meeting button
    await page.click('button:has-text("Book Meeting")');
    await expect(page).toHaveURL(/\/book\/.+/);
    
    // Select time slot
    await page.click('[data-testid="time-slot-button"]:not([disabled]):first');
    
    // Fill meeting details
    await page.fill('[name="meeting_goal"]', 'I want to discuss product-market fit for my SaaS startup');
    await page.fill('[name="materials_url_0"]', 'https://example.com/deck.pdf');
    
    // Confirm booking
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify success
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=Google Meet')).toBeVisible();
    
    // Navigate to My Bookings
    await page.click('a:has-text("My Bookings")');
    await expect(page).toHaveURL('/bookings');
    
    // Verify booking appears in list
    await expect(page.locator('[data-testid="booking-card"]').first()).toBeVisible();
  });
  
  test('shows error when slot is already booked', async ({ page, context }) => {
    // Open two browser contexts to simulate concurrent booking
    const page2 = await context.newPage();
    
    await page.goto('/book/mentor-123');
    await page2.goto('/book/mentor-123');
    
    // Both select same slot
    const slotButton = '[data-testid="time-slot-button"]:first';
    await page.click(slotButton);
    await page2.click(slotButton);
    
    // First user books successfully
    await page.fill('[name="meeting_goal"]', 'First booking');
    await page.click('button:has-text("Confirm Booking")');
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    
    // Second user sees error
    await page2.fill('[name="meeting_goal"]', 'Second booking');
    await page2.click('button:has-text("Confirm Booking")');
    await expect(page2.locator('text=slot was just booked')).toBeVisible();
  });
  
  test('validates meeting goal length', async ({ page }) => {
    await page.goto('/book/mentor-123');
    await page.click('[data-testid="time-slot-button"]:first');
    
    // Try to submit with short goal
    await page.fill('[name="meeting_goal"]', 'Too short');
    await page.click('button:has-text("Confirm Booking")');
    
    // Should show validation error
    await expect(page.locator('text=at least 10 characters')).toBeVisible();
  });
});
```

**Visual Regression Testing:**

```typescript
// apps/web/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('mentor directory matches snapshot', async ({ page }) => {
    await page.goto('/mentors');
    await page.waitForSelector('[data-testid="mentor-card"]');
    
    await expect(page).toHaveScreenshot('mentor-directory.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
  
  test('booking form matches snapshot', async ({ page }) => {
    await page.goto('/book/mentor-123');
    await page.click('[data-testid="time-slot-button"]:first');
    
    await expect(page.locator('[data-testid="booking-form"]')).toHaveScreenshot('booking-form.png');
  });
});
```

---

## 13.5 Chrome DevTools MCP (Alternative/Complement to Playwright)

**Overview:**

Chrome DevTools MCP is Chrome's native Model Context Protocol tool for browser automation and debugging. It provides an alternative or complement to Playwright for E2E testing and debugging.

**Key Advantages:**
- **Native Chrome Integration** - Direct access to Chrome DevTools capabilities
- **Performance Analysis** - Built-in performance tracing and Core Web Vitals
- **Console Log Viewing** - Direct access to console messages
- **Network Inspection** - Full network request/response inspection
- **No Third-Party Dependencies** - Native Chrome tooling

**Installation:**

```bash
# Install Chrome DevTools MCP
npm install chrome-devtools-mcp

# Configure in MCP client (e.g., Claude Desktop)
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --yes
```

**Configuration Example:**

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--yes",
        "--isolated=true",
        "--headless=false"
      ]
    }
  }
}
```

**Use Cases:**

**1. E2E Testing:**
```typescript
// Using Chrome DevTools MCP for E2E testing
// Can be used alongside or instead of Playwright

// Navigate and interact
await navigatePage('https://officehours.youcanjustdothings.io');
await fill({ uid: 'email-input', value: 'mentee@test.com' });
await click({ uid: 'login-button' });

// Take snapshots for validation
const snapshot = await takeSnapshot();
// Verify elements are present in snapshot

// Capture console messages
const consoleLogs = await listConsoleMessages();
// Verify no errors in console
```

**2. Performance Testing:**
```typescript
// Start performance trace
await performanceStartTrace({ reload: true, autoStop: false });

// Interact with the application
await navigatePage('https://officehours.youcanjustdothings.io/book/mentor-123');
await click({ uid: 'time-slot-button' });
await fillForm({
  elements: [
    { uid: 'meeting-goal', value: 'Discuss product strategy' }
  ]
});

// Stop trace and analyze
await performanceStopTrace();
const insights = await performanceAnalyzeInsight({ insightName: 'LCPBreakdown' });
// Verify Core Web Vitals are within acceptable ranges
```

**3. Network Debugging:**
```typescript
// Navigate to page
await navigatePage('https://officehours.youcanjustdothings.io/bookings');

// List all network requests
const requests = await listNetworkRequests({
  resourceTypes: ['fetch', 'xhr'],
  pageSize: 50
});

// Get specific request details
const bookingRequest = await getNetworkRequest({
  url: '/api/bookings'
});

// Verify API responses
// bookingRequest.response.status === 200
// bookingRequest.response.body contains expected data
```

**4. Console Log Verification:**
```typescript
// Navigate and perform actions
await navigatePage('https://officehours.youcanjustdothings.io');
await click({ uid: 'book-meeting-button' });

// Check console for errors
const consoleMessages = await listConsoleMessages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

// Verify no console errors
if (errors.length > 0) {
  throw new Error(`Console errors found: ${JSON.stringify(errors)}`);
}
```

**5. Visual Testing:**
```typescript
// Take screenshot for visual regression
await navigatePage('https://officehours.youcanjustdothings.io/mentors');
await waitFor({ text: 'Find Mentors' });

// Take full page screenshot
await takeScreenshot({
  fullPage: true,
  format: 'png',
  filePath: './screenshots/mentor-directory.png'
});

// Take element screenshot
await takeScreenshot({
  uid: 'booking-card',
  format: 'png',
  filePath: './screenshots/booking-card.png'
});
```

**Comparison: Chrome DevTools MCP vs Playwright**

| Feature | Chrome DevTools MCP | Playwright |
|---------|---------------------|------------|
| **Browser Support** | Chrome only | Chrome, Firefox, Safari, Edge |
| **Performance Tracing** | ✅ Native Chrome tracing | ⚠️ Limited |
| **Console Access** | ✅ Direct access | ⚠️ Via API |
| **Network Inspection** | ✅ Full DevTools access | ✅ Built-in |
| **Test Framework** | ❌ Bring your own | ✅ Full framework |
| **CI/CD Integration** | ✅ Headless mode | ✅ Mature support |
| **Learning Curve** | Medium (MCP-based) | Low (Test framework) |
| **Debugging** | ✅ Native DevTools | ✅ Built-in tools |

**Recommendation:**

- **Use Playwright for:** Cross-browser E2E testing, comprehensive test suites, CI/CD pipelines
- **Use Chrome DevTools MCP for:** Performance analysis, detailed debugging, Chrome-specific testing, console log verification
- **Use Both:** Playwright for main E2E tests, Chrome DevTools MCP for performance and debugging workflows

**Example Hybrid Approach:**

```typescript
// Main E2E tests with Playwright
// apps/web/e2e/booking-flow.spec.ts (Playwright)
test('booking flow works across browsers', async ({ page }) => {
  // Standard Playwright test (runs on Chrome, Firefox, Safari)
});

// Performance tests with Chrome DevTools MCP
// apps/web/performance/booking-performance.ts (Chrome DevTools MCP)
async function testBookingPerformance() {
  await performanceStartTrace({ reload: true });
  // ... perform booking flow
  await performanceStopTrace();
  const insights = await performanceAnalyzeInsight({ insightName: 'LCPBreakdown' });
  // Verify LCP < 2.5s
}
```

**Developer Workflow:**

1. **Local Development:** Use Chrome DevTools MCP for debugging and console log inspection
2. **CI/CD Pipeline:** Use Playwright for comprehensive cross-browser E2E tests
3. **Performance Monitoring:** Use Chrome DevTools MCP for periodic performance audits
4. **Bug Investigation:** Use Chrome DevTools MCP to reproduce and inspect console/network issues

---

## 13.6 API Contract Testing

**OpenAPI Validation:**

```typescript
// apps/api/src/test-utils/contract-testing.ts
import { OpenAPIValidator } from 'express-openapi-validator';
import { readFileSync } from 'fs';

export async function validateAPIContract(
  endpoint: string,
  method: string,
  request: any,
  response: any
) {
  const openApiSpec = JSON.parse(
    readFileSync('./openapi.json', 'utf-8')
  );
  
  const validator = new OpenAPIValidator({
    apiSpec: openApiSpec,
    validateRequests: true,
    validateResponses: true,
  });
  
  // Validate request
  const requestValidation = validator.validateRequest({
    path: endpoint,
    method,
    body: request.body,
    headers: request.headers,
  });
  
  if (requestValidation.errors.length > 0) {
    throw new Error(`Request validation failed: ${JSON.stringify(requestValidation.errors)}`);
  }
  
  // Validate response
  const responseValidation = validator.validateResponse({
    path: endpoint,
    method,
    status: response.status,
    body: response.body,
  });
  
  if (responseValidation.errors.length > 0) {
    throw new Error(`Response validation failed: ${JSON.stringify(responseValidation.errors)}`);
  }
}

// Usage in tests
test('POST /api/bookings conforms to OpenAPI spec', async () => {
  const request = {
    body: { time_slot_id: 'slot-123', meeting_goal: 'Test' },
    headers: { 'Authorization': 'Bearer token' },
  };
  
  const response = await app.request('/api/bookings', {
    method: 'POST',
    ...request,
  });
  
  await validateAPIContract('/api/bookings', 'POST', request, {
    status: response.status,
    body: await response.json(),
  });
});
```

## 13.7 Test Utilities

**Test Data Factories:**

```typescript
// apps/api/src/test-utils/factories.ts
import { faker } from '@faker-js/faker';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'mentee',
    reputation_score: 3.5,
    reputation_tier: 'silver',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

export function createTestBooking(overrides?: Partial<Booking>): Booking {
  return {
    id: faker.string.uuid(),
    time_slot_id: faker.string.uuid(),
    mentor_id: faker.string.uuid(),
    mentee_id: faker.string.uuid(),
    meeting_goal: faker.lorem.paragraph(),
    status: 'confirmed',
    meeting_start_time: faker.date.future(),
    meeting_end_time: faker.date.future(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

export function createTestSlot(overrides?: Partial<TimeSlot>): TimeSlot {
  const start = faker.date.future();
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  
  return {
    id: faker.string.uuid(),
    availability_block_id: faker.string.uuid(),
    mentor_id: faker.string.uuid(),
    start_time: start,
    end_time: end,
    is_booked: false,
    booking_id: null,
    created_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}
```

**Mock Data:**

```typescript
// apps/web/src/test-utils/mocks.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  rest.get('/api/mentors', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John Doe', expertise: 'Product Strategy' },
        { id: '2', name: 'Jane Smith', expertise: 'Marketing' },
      ])
    );
  }),
  
  rest.post('/api/bookings', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'booking-123',
        status: 'confirmed',
        meeting_start_time: new Date().toISOString(),
      })
    );
  }),
];

export const server = setupServer(...handlers);

// Setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 13.8 Testing Best Practices

**1. Arrange-Act-Assert Pattern:**

```typescript
test('should calculate total price', () => {
  // Arrange - Set up test data
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];
  
  // Act - Execute the functionality
  const total = calculateTotal(items);
  
  // Assert - Verify the result
  expect(total).toBe(35);
});
```

**2. Test Naming Convention:**

```typescript
// Good: Descriptive test names
test('should return 409 when slot is already booked');
test('should calculate reputation score with probationary clamp for new users');

// Bad: Vague test names
test('booking test');
test('reputation');
```

**3. One Assertion Per Test (when practical):**

```typescript
// Good: Focused tests
test('should create booking with correct mentor_id', async () => {
  const booking = await createBooking(data);
  expect(booking.mentor_id).toBe('mentor-123');
});

test('should create booking with confirmed status', async () => {
  const booking = await createBooking(data);
  expect(booking.status).toBe('confirmed');
});

// Acceptable: Related assertions
test('should create booking with all required fields', async () => {
  const booking = await createBooking(data);
  expect(booking.mentor_id).toBe('mentor-123');
  expect(booking.mentee_id).toBe('mentee-123');
  expect(booking.status).toBe('confirmed');
});
```

**4. Avoid Test Interdependence:**

```typescript
// Bad: Tests depend on each other
test('create user', () => {
  globalUser = createUser();
});

test('update user', () => {
  updateUser(globalUser); // Depends on previous test
});

// Good: Independent tests
test('create user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});

test('update user', () => {
  const user = createUser(); // Create fresh data
  const updated = updateUser(user);
  expect(updated).toBeDefined();
});
```

**5. Use Test Doubles Appropriately:**

```typescript
// Mock: Replace entire implementation
const mockRepository = {
  findById: vi.fn().mockResolvedValue(testUser),
};

// Spy: Observe real implementation
const spy = vi.spyOn(repository, 'findById');
await service.getUser('123');
expect(spy).toHaveBeenCalledWith('123');

// Stub: Provide canned responses
const stub = vi.fn();
stub.mockReturnValueOnce('first call');
stub.mockReturnValueOnce('second call');
```

## 13.9 CI/CD Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 13.10 Test Coverage Goals

**Coverage Metrics:**
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

**Priority Areas for Coverage:**
1. Business logic (services, repositories)
2. API routes and middleware
3. Utility functions
4. Critical user flows (booking, authentication)

**Acceptable Lower Coverage:**
- UI components (<70% acceptable)
- Configuration files
- Type definitions

## 13.11 Test Coverage by Epic

This subsection maps the PRD's epic structure to specific test coverage expectations, ensuring comprehensive testing aligned with the Walking Skeleton approach.

**Epic 0: Walking Skeleton (END-TO-END MVP)**
- **Target Coverage:** 80% for booking flow
- **Critical Paths:**
  - `POST /auth/magic-link` → Email authentication flow
  - `GET /users/:id/profile` → Profile retrieval
  - `POST /availability` → Mentor creates availability
  - `GET /availability/slots` → Mentee browses slots
  - `POST /bookings` → Complete booking creation with race condition handling
  - `GET /bookings` → View bookings dashboard
- **Unit Tests Required:**
  - Date/time utilities (timezone conversions)
  - Slot generation logic
  - Basic validation schemas (Zod)
- **Integration Tests Required:**
  - Full booking flow with database transactions
  - Concurrent booking attempts (race condition test)
  - RLS policy enforcement
- **E2E Tests Required:**
  - Complete user journey: Login → Browse → Book → Confirm

**Epic 1: Infrastructure Depth**
- **Target Coverage:** 85% for error handling, validation, logging
- **Focus Areas:**
  - Centralized error handler middleware
  - Zod validation for all API endpoints
  - OpenAPI spec generation and validation
  - Rate limiting middleware
  - Soft delete query helpers
- **Unit Tests Required:**
  - Custom error classes (AppError, ValidationError, etc.)
  - Error message dictionary lookups
  - Validation schema edge cases
- **Integration Tests Required:**
  - API contract tests against OpenAPI spec
  - Rate limiting behavior (burst and sustained)
  - Error response format consistency

**Epic 2: Authentication & Profile Depth**
- **Target Coverage:** 90% for auth flows (critical security)
- **Critical Paths:**
  - OAuth combined flow (Google + calendar in one consent)
  - OAuth combined flow (Microsoft + calendar in one consent)
  - Email whitelist validation
  - Magic link post-login calendar connection
  - Tag selection and taxonomy management
- **Unit Tests Required:**
  - Tag normalization logic (lowercase_snake_case)
  - Avatar cropping metadata calculations
  - Profile validation rules
- **Integration Tests Required:**
  - OAuth callback handling with calendar tokens
  - Email whitelist enforcement (reject unauthorized)
  - Tag approval workflow
  - Profile update with tag changes
- **E2E Tests Required:**
  - Complete OAuth signup with calendar connection
  - Profile editing with tag selection

**Epic 3: Calendar Integration**
- **Target Coverage:** 85% for calendar providers
- **Focus Areas:**
  - `ICalendarProvider` interface implementations
  - Google Calendar provider (OAuth, conflict check, event creation)
  - Microsoft Outlook provider (OAuth, conflict check, event creation)
  - Google Meet link generation
  - Token refresh logic
- **Unit Tests Required:**
  - Calendar event parsing/formatting
  - Conflict detection algorithms
  - Token expiration handling
- **Integration Tests Required:**
  - Mock calendar API responses
  - Conflict check before booking
  - Event creation on successful booking
  - Calendar disconnection (preserve existing bookings)
- **E2E Tests Required:**
  - Connect calendar post-login
  - Book meeting with automatic calendar event

**Epic 4: Availability & Booking Depth**
- **Target Coverage:** 85% for booking logic
- **Critical Paths:**
  - Recurring availability (weekly, monthly, quarterly)
  - Slot generation (30-day rolling window)
  - Booking cancellation (within 2hrs = responsiveness penalty)
  - Late cancellation detection
  - Real-time slot updates via Supabase Realtime
- **Unit Tests Required:**
  - Slot generation for recurrence patterns
  - Buffer time calculations
  - Cancellation eligibility logic
- **Integration Tests Required:**
  - Availability block CRUD
  - Slot generation on availability save
  - Booking with calendar conflict check
  - Cancellation cascade (update reputation)
- **E2E Tests Required:**
  - Mentor creates recurring availability
  - Mentee books and cancels meeting

**Epic 5: Airtable Integration**
- **Target Coverage:** 80% for sync logic
- **Focus Areas:**
  - Webhook signature validation
  - Field mapping (Airtable → Supabase)
  - Tag normalization and sync
  - Taxonomy sync
  - User deletion handling (soft delete + cascade)
- **Unit Tests Required:**
  - Field mapping transformations
  - Tag normalization (spaces → underscores)
  - Role enum mapping (case-insensitive)
- **Integration Tests Required:**
  - Webhook payload processing
  - Idempotent upsert (same record twice)
  - User deletion cascade (cancel future meetings)
  - Unrecognized column handling (log warning, continue)
- **E2E Tests Required:**
  - Simulate Airtable webhook → verify sync

**Epic 6: Matching & Discovery**
- **Target Coverage:** 85% for matching algorithms
- **Focus Areas:**
  - `IMatchingEngine` interface
  - Tag-based matching algorithm
  - Match score calculations
  - Match explanation generation
  - Mentor/mentee directory filtering
- **Unit Tests Required:**
  - Tag overlap scoring (60% weight)
  - Stage compatibility (20% weight)
  - Reputation tier compatibility (20% weight)
  - Match explanation formatting
- **Integration Tests Required:**
  - Find mentors with filters (tags, tier, dormancy)
  - Match score calculation with real data
  - Personalized recommendations
- **E2E Tests Required:**
  - Mentee searches mentors with filters
  - Mentor sends meeting interest (auto-creates override if needed)

**Epic 7: Reputation & Ratings**
- **Target Coverage:** 95% for reputation calculator (business-critical)
- **Focus Areas:**
  - `IReputationCalculator` interface
  - Reputation score formula (rating × completion × responsiveness + tenure)
  - Probationary clamp (< 3 ratings, min 3.5)
  - Tier assignment (Bronze/Silver/Gold/Platinum)
  - Booking limits enforcement
  - Tier restriction checks
  - Override request workflow
- **Unit Tests Required:**
  - Score calculation with all edge cases:
    - New user (< 3 ratings, score < 3.5) → clamped to 3.5
    - New user (< 3 ratings, score > 3.5) → not clamped
    - Established user (≥ 3 ratings) → calculated score
  - Responsiveness factor calculation (1.2× / 1.0× / 0.8×)
  - Tenure bonus (0.1/month, max 1.0)
  - Tier determination for boundary values (3.0, 4.0, 4.5)
  - Booking limit by tier (2/5/10/unlimited)
- **Integration Tests Required:**
  - Rating submission (mutual requirement)
  - Reputation recalculation trigger (after rating)
  - Tier-based booking limit enforcement
  - Tier restriction check (Bronze cannot book Gold/Platinum)
  - Override request creation and approval
  - Override expiration (7 days)
- **E2E Tests Required:**
  - Complete booking → rate session → see updated reputation
  - Attempt booking above tier → request override → coordinator approves

**Epic 8: Admin & Coordinator Tools**
- **Target Coverage:** 80% for admin operations
- **Focus Areas:**
  - User management (manual reputation override, user deactivation)
  - Override request dashboard
  - Tag approval workflow
  - White-glove scheduling (bypass tier restrictions)
  - Audit logging
- **Unit Tests Required:**
  - Reputation override validation
  - Audit log entry formatting
- **Integration Tests Required:**
  - Manual reputation score override
  - Tag approval (user_request → approved)
  - Override request approval/denial
  - White-glove booking creation
  - Audit log retrieval
- **E2E Tests Required:**
  - Coordinator approves tier override request
  - Coordinator approves new taxonomy tag

---

**Test Coverage Summary Table:**

| Epic | Coverage Target | Critical Focus | Test Priorities |
|------|----------------|----------------|-----------------|
| Epic 0 | 80% | Booking flow | E2E journey, race conditions |
| Epic 1 | 85% | Infrastructure | Error handling, validation |
| Epic 2 | 90% | Auth security | OAuth flows, whitelist |
| Epic 3 | 85% | Calendar integration | Provider interfaces, conflict check |
| Epic 4 | 85% | Booking logic | Recurrence, cancellation |
| Epic 5 | 80% | Airtable sync | Webhook, field mapping |
| Epic 6 | 85% | Matching | Algorithm accuracy |
| Epic 7 | 95% | Reputation | Formula correctness, edge cases |
| Epic 8 | 80% | Admin tools | Override workflows |

---



**Section 13 Complete.** This testing strategy provides:
- ✅ Comprehensive testing philosophy and pyramid
- ✅ Unit testing with Vitest for utilities, services, and components
- ✅ Integration testing for API endpoints and database operations
- ✅ End-to-end testing with Playwright for user journeys
- ✅ API contract testing with OpenAPI validation
- ✅ Test utilities, factories, and mock data
- ✅ Testing best practices and patterns
- ✅ CI/CD integration workflows
- ✅ Test coverage goals and metrics

