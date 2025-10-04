# 7. Frontend Architecture

This section defines the React frontend architecture, including application structure, routing strategy, state management, data fetching patterns, authentication flows, and real-time communication. The frontend is built with **React 18.3.x**, **Vite 5.x**, **TypeScript 5.7.x**, and follows modern React best practices.

## 7.1 Frontend Application Structure

The frontend follows a **feature-based directory structure** with clear separation of concerns:

```
apps/web/
├── public/                          # Static assets
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
├── src/
│   ├── components/                  # React components (from Section 6)
│   │   ├── ui/                      # Shadcn/ui components (auto-generated)
│   │   ├── common/                  # Shared components
│   │   ├── features/                # Feature-specific components
│   │   │   ├── discovery/
│   │   │   ├── bookings/
│   │   │   ├── profile/
│   │   │   ├── availability/
│   │   │   └── coordinator/
│   │   └── layouts/                 # Layout components
│   ├── pages/                       # Route pages (one component per route)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── CallbackPage.tsx    # OAuth callback handler
│   │   ├── DashboardPage.tsx
│   │   ├── MentorsPage.tsx
│   │   ├── MenteesPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── BookingPage.tsx
│   │   ├── AvailabilityPage.tsx    # Mentor-only
│   │   ├── CoordinatorDashboard.tsx # Coordinator-only
│   │   └── NotFoundPage.tsx
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts               # Authentication hook
│   │   ├── useBookings.ts           # Booking management
│   │   ├── useUsers.ts              # User queries
│   │   ├── useAvailability.ts       # Availability management
│   │   ├── useRealtime.ts           # Supabase Realtime subscriptions
│   │   ├── useCalendar.ts           # Calendar integration
│   │   └── useToast.ts              # Toast notifications
│   ├── services/                    # API client and external services
│   │   ├── api/                     # API client functions
│   │   │   ├── client.ts            # Base fetch wrapper
│   │   │   ├── auth.ts              # Auth endpoints
│   │   │   ├── users.ts             # User endpoints
│   │   │   ├── bookings.ts          # Booking endpoints
│   │   │   ├── availability.ts      # Availability endpoints
│   │   │   └── coordinator.ts       # Coordinator endpoints
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── calendar.ts              # Calendar provider abstractions
│   ├── stores/                      # Zustand stores
│   │   ├── authStore.ts             # Auth state (user, session)
│   │   ├── bookingStore.ts          # Booking UI state (selected slot, form data)
│   │   └── notificationStore.ts     # Toast notification queue
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.tsx          # Auth provider wrapper
│   │   └── RealtimeContext.tsx      # Realtime connection provider
│   ├── lib/                         # Utilities and helpers
│   │   ├── utils.ts                 # General utilities (cn, formatters)
│   │   ├── constants.ts             # App constants
│   │   ├── validators.ts            # Client-side validation helpers
│   │   └── errors.ts                # Error handling utilities
│   ├── types/                       # Frontend-specific types
│   │   ├── routes.ts                # Route definitions
│   │   └── ui.ts                    # UI-specific types
│   ├── App.tsx                      # Root component with providers
│   ├── main.tsx                     # Entry point
│   ├── router.tsx                   # React Router configuration
│   └── index.css                    # Global styles (Tailwind imports)
├── e2e/                             # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── booking-flow.spec.ts
│   └── profile.spec.ts
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
├── vitest.config.ts                 # Vitest configuration
├── playwright.config.ts             # Playwright configuration
└── package.json                     # Dependencies
```

**Key Principles:**
- **Feature-based organization:** Related components grouped by feature domain
- **Colocation:** Keep files that change together close together
- **Separation of concerns:** Clear boundaries between UI, business logic, and data
- **Import aliases:** Use `@/` for `src/`, `@shared/` for shared package

## 7.2 Routing Strategy

**Router:** React Router v6.x with data loading and protected routes

**Router Configuration:**
```typescript
// apps/web/src/router.tsx

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RoleGuard } from '@/components/common/RoleGuard';

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const MentorsPage = lazy(() => import('@/pages/MentorsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AvailabilityPage = lazy(() => import('@/pages/AvailabilityPage'));
const CoordinatorDashboard = lazy(() => import('@/pages/CoordinatorDashboard'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Public routes
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'mentors',
            element: <MentorsPage />,
          },
          {
            path: 'mentees',
            element: <MenteesPage />,
          },
          {
            path: 'profile/:userId?',
            element: <ProfilePage />,
          },
          {
            path: 'bookings/:bookingId',
            element: <BookingPage />,
          },
          // Mentor-only routes
          {
            element: <RoleGuard allowedRoles={['mentor']} />,
            children: [
              {
                path: 'availability',
                element: <AvailabilityPage />,
              },
            ],
          },
          // Coordinator-only routes
          {
            element: <RoleGuard allowedRoles={['coordinator']} />,
            children: [
              {
                path: 'coordinator',
                element: <CoordinatorDashboard />,
              },
            ],
          },
        ],
      },
    ],
  },
  // Auth routes (separate layout)
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'callback',
        element: <CallbackPage />, // OAuth callback
      },
    ],
  },
  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

**ProtectedRoute Component:**
```typescript
// apps/web/src/components/common/ProtectedRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    // Redirect to login with return URL
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

**RoleGuard Component:**
```typescript
// apps/web/src/components/common/RoleGuard.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@shared/types/user';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    // Unauthorized access
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

**Deep Linking & Bookmark-able States:**

To enable users to bookmark and share specific application states, the routing strategy implements URL-based state management for key user flows:

```typescript
// apps/web/src/pages/MentorsPage.tsx

import { useSearchParams } from 'react-router-dom';

export function MentorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read state from URL
  const filters = {
    tags: searchParams.getAll('tag'),
    tier: searchParams.get('tier'),
    hasAvailability: searchParams.get('available') === 'true',
  };
  
  const handleFilterChange = (newFilters: Filters) => {
    const params = new URLSearchParams();
    
    // Encode state in URL
    newFilters.tags.forEach(tag => params.append('tag', tag));
    if (newFilters.tier) params.set('tier', newFilters.tier);
    if (newFilters.hasAvailability) params.set('available', 'true');
    
    setSearchParams(params);
  };
  
  return <MentorDirectory filters={filters} onFilterChange={handleFilterChange} />;
}
```

**Bookmark-able URLs:**

| State | Example URL | Description |
|-------|-------------|-------------|
| **Filtered Mentor Search** | `/mentors?tag=fintech&tag=saas&tier=gold&available=true` | Search results with specific filters applied |
| **User Profile** | `/profile/550e8400-e29b-41d4-a716-446655440001` | Direct link to specific user profile |
| **Booking Details** | `/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Direct link to specific booking |
| **Profile Edit Mode** | `/profile?edit=true` | Profile page in edit mode |
| **Dashboard Tab** | `/dashboard?tab=upcoming` | Specific dashboard tab (upcoming vs past bookings) |
| **Coordinator View** | `/coordinator?view=overrides&status=pending` | Coordinator dashboard filtered view |

**Implementation Pattern:**

```typescript
// Custom hook for managing URL state
export function useURLState<T extends Record<string, any>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const state = useMemo(() => {
    const result = { ...defaults };
    
    // Parse URL params into typed state
    Object.keys(defaults).forEach(key => {
      const value = searchParams.get(key);
      if (value !== null) {
        // Type coercion based on default value type
        if (typeof defaults[key] === 'boolean') {
          result[key] = value === 'true';
        } else if (typeof defaults[key] === 'number') {
          result[key] = Number(value);
        } else if (Array.isArray(defaults[key])) {
          result[key] = searchParams.getAll(key);
        } else {
          result[key] = value;
        }
      }
    });
    
    return result as T;
  }, [searchParams, defaults]);
  
  const setState = useCallback((updates: Partial<T>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === defaults[key]) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.delete(key);
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.set(key, String(value));
      }
    });
    
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, defaults]);
  
  return [state, setState];
}
```

**Usage Example:**

```typescript
// apps/web/src/pages/DashboardPage.tsx

interface DashboardState {
  tab: 'upcoming' | 'past' | 'all';
  sortBy: 'date' | 'mentor';
}

export function DashboardPage() {
  const [state, setState] = useURLState<DashboardState>({
    tab: 'upcoming',
    sortBy: 'date',
  });
  
  return (
    <div>
      <Tabs value={state.tab} onValueChange={tab => setState({ tab })}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Tab content */}
    </div>
  );
}
```

**Benefits:**
- ✅ Users can bookmark filtered views and search results
- ✅ Share links preserve exact application state
- ✅ Browser back/forward navigation works intuitively
- ✅ SEO-friendly for public pages
- ✅ Analytics can track specific user paths
- ✅ Deep links from emails/notifications work correctly

---

## 7.3 State Management

**Strategy:** Hybrid approach using **Zustand** (global UI state) + **React Query** (server state)

### 7.3.1 Zustand for UI State

**Auth Store:**
```typescript
// apps/web/src/stores/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserWithProfile } from '@shared/types/user';

interface AuthState {
  user: UserWithProfile | null;
  session: { access_token: string; refresh_token: string } | null;
  setUser: (user: UserWithProfile | null) => void;
  setSession: (session: AuthState['session']) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      clearAuth: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ 
        session: state.session // Only persist session, not full user object
      }),
    }
  )
);
```

**Booking UI Store:**
```typescript
// apps/web/src/stores/bookingStore.ts

import { create } from 'zustand';
import { TimeSlot } from '@shared/types/availability';

interface BookingState {
  selectedMentorId: string | null;
  selectedSlot: TimeSlot | null;
  bookingFormData: {
    meeting_goal: string;
    materials_urls: string[];
  };
  setSelectedMentor: (mentorId: string | null) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  updateFormData: (data: Partial<BookingState['bookingFormData']>) => void;
  resetBookingFlow: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedMentorId: null,
  selectedSlot: null,
  bookingFormData: {
    meeting_goal: '',
    materials_urls: [],
  },
  setSelectedMentor: (mentorId) => set({ selectedMentorId: mentorId }),
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  updateFormData: (data) =>
    set((state) => ({
      bookingFormData: { ...state.bookingFormData, ...data },
    })),
  resetBookingFlow: () =>
    set({
      selectedMentorId: null,
      selectedSlot: null,
      bookingFormData: { meeting_goal: '', materials_urls: [] },
    }),
}));
```

**Notification Store:**
```typescript
// apps/web/src/stores/notificationStore.ts

import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error' | 'warning';
}

interface NotificationState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36) }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
```

### 7.3.2 React Query for Server State

**QueryClient Configuration:**
```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Query Hooks Example:**
```typescript
// apps/web/src/hooks/useUsers.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, getUserById, updateUserProfile } from '@/services/api/users';
import { UserWithProfile } from '@shared/types/user';

// Query keys for cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch user list with filters
export function useUsers(filters: { role?: string; tags?: string[] }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters),
  });
}

// Fetch single user by ID
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUserById(userId),
    enabled: !!userId, // Only run if userId exists
  });
}

// Update user profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserWithProfile>) => updateUserProfile(data),
    onSuccess: (updatedUser) => {
      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Optimistically update cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
    },
  });
}
```

**Booking Hooks Example:**
```typescript
// apps/web/src/hooks/useBookings.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMyBookings, 
  createBooking, 
  cancelBooking 
} from '@/services/api/bookings';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBookingStore } from '@/stores/bookingStore';

export const bookingKeys = {
  all: ['bookings'] as const,
  my: () => [...bookingKeys.all, 'my'] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
};

export function useMyBookings() {
  return useQuery({
    queryKey: bookingKeys.my(),
    queryFn: getMyBookings,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);
  const resetBookingFlow = useBookingStore((state) => state.resetBookingFlow);

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // Invalidate bookings list
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
      
      // Show success toast
      addToast({
        title: 'Booking Confirmed',
        description: 'Your meeting has been scheduled successfully.',
        variant: 'success',
      });
      
      // Reset booking flow state
      resetBookingFlow();
    },
    onError: (error: any) => {
      addToast({
        title: 'Booking Failed',
        description: error.message || 'Something went wrong',
        variant: 'error',
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ 
      bookingId, 
      reason, 
      notes 
    }: { 
      bookingId: string; 
      reason?: string; 
      notes?: string 
    }) => cancelBooking(bookingId, reason, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
      addToast({
        title: 'Booking Cancelled',
        description: 'The meeting has been cancelled.',
        variant: 'default',
      });
    },
  });
}
```

## 7.4 Data Fetching & API Client

**Base API Client:**
```typescript
// apps/web/src/services/api/client.ts

import { useAuthStore } from '@/stores/authStore';
import type { paths } from '@shared/types/api.generated';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { session } = useAuthStore.getState();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (session expired)
  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    window.location.href = '/auth/login';
    throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
  }

  const data = await response.json();

  if (!response.ok) {
    const error = data.error || {};
    throw new ApiError(
      error.message || 'An error occurred',
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.details
    );
  }

  return data as T;
}
```

**API Service Example:**
```typescript
// apps/web/src/services/api/bookings.ts

import { apiClient } from './client';
import type { paths } from '@shared/types/api.generated';

type CreateBookingRequest = 
  paths['/bookings']['post']['requestBody']['content']['application/json'];
type BookingResponse = 
  paths['/bookings']['post']['responses']['201']['content']['application/json'];
type BookingsListResponse = 
  paths['/bookings/my-bookings']['get']['responses']['200']['content']['application/json'];

export async function getMyBookings(): Promise<BookingsListResponse> {
  return apiClient<BookingsListResponse>('/bookings/my-bookings');
}

export async function createBooking(
  data: CreateBookingRequest
): Promise<BookingResponse> {
  return apiClient<BookingResponse>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(
  bookingId: string,
  reason?: string,
  notes?: string
): Promise<BookingResponse> {
  return apiClient<BookingResponse>(`/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason, notes }),
  });
}
```

## 7.5 Authentication Flow

**Auth Hook:**
```typescript
// apps/web/src/hooks/useAuth.ts

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { UserWithProfile } from '@shared/types/user';

export function useAuth() {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        fetchUser(session.access_token);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        fetchUser(session.access_token);
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUser(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData: UserWithProfile = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearAuth();
  }

  return {
    user,
    session,
    isLoading: session !== null && user === null,
    isAuthenticated: !!user,
    signOut,
  };
}
```

**Login/Signup Components:**
```typescript
// apps/web/src/pages/auth/LoginPage.tsx

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/services/supabase';
import { useNotificationStore } from '@/stores/notificationStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useNotificationStore((state) => state.addToast);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  async function handleMagicLink() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      addToast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        variant: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      },
    });

    if (error) {
      addToast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Sign In</h1>
      
      {/* Magic Link */}
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={handleMagicLink} disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <Button onClick={handleGoogleOAuth} variant="outline" className="w-full">
        Continue with Google
      </Button>
      
      <Button onClick={() => {/* Microsoft OAuth */}} variant="outline" className="w-full">
        Continue with Microsoft
      </Button>
    </div>
  );
}
```

_[Continued in next part...]_

## 7.6 Real-Time Updates (Supabase Realtime)

**Real-Time Strategy:** Subscribe to booking and availability changes to prevent double-booking (FR106, NFR7)

**Realtime Hook:**
```typescript
// apps/web/src/hooks/useRealtime.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { bookingKeys } from '@/hooks/useBookings';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useBookingRealtime(mentorId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!mentorId) return;

    let channel: RealtimeChannel;

    // Subscribe to time_slots table for this mentor
    channel = supabase
      .channel(`time_slots:mentor_id=eq.${mentorId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'time_slots',
          filter: `mentor_id=eq.${mentorId}`,
        },
        (payload) => {
          console.log('Slot updated:', payload);
          
          // Invalidate availability queries to refetch
          queryClient.invalidateQueries({ 
            queryKey: ['availability', 'slots', mentorId] 
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [mentorId, queryClient]);
}

export function useMyBookingsRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to bookings where user is mentor or mentee
    const channel = supabase
      .channel('my_bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `or(mentor_id.eq.${user.id},mentee_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('Booking updated:', payload);
          
          // Refetch bookings list
          queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
          
          // Show toast for updates
          if (payload.eventType === 'UPDATE' && payload.new.status === 'canceled') {
            addToast({
              title: 'Booking Cancelled',
              description: 'A meeting was cancelled. Check your bookings.',
              variant: 'warning',
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, queryClient]);
}
```

**Usage in Components:**
```typescript
// apps/web/src/pages/BookingPage.tsx

export default function BookingPage() {
  const { mentorId } = useParams();
  
  // Subscribe to real-time updates for this mentor's slots
  useBookingRealtime(mentorId);
  
  const { data: slots, isLoading } = useQuery({
    queryKey: ['availability', 'slots', mentorId],
    queryFn: () => fetchAvailableSlots(mentorId),
  });

  // ... rest of component
}
```

## 7.7 Form Handling

**Strategy:** React Hook Form + Zod validation (shared schemas from backend)

**Form Example:**
```typescript
// apps/web/src/components/features/bookings/BookingForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateBookingSchema } from '@shared/schemas/booking';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function BookingForm({ slotId, onSubmit }: BookingFormProps) {
  const form = useForm({
    resolver: zodResolver(CreateBookingSchema),
    defaultValues: {
      time_slot_id: slotId,
      meeting_goal: '',
      materials_urls: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="meeting_goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Goal *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What would you like to discuss? (min 10 characters)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="materials_urls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Materials (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Add links to pitch decks, documents, etc."
                  {...field}
                  value={field.value?.[0] || ''}
                  onChange={(e) => field.onChange([e.target.value])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Confirming...' : 'Confirm Booking'}
        </Button>
      </form>
    </Form>
  );
}
```

**Profile Form with Role-Specific Fields:**
```typescript
// apps/web/src/components/features/profile/ProfileForm.tsx

export function ProfileForm() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const form = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user?.profile.name || '',
      title: user?.profile.title || '',
      bio: user?.profile.bio || '',
      // Mentor-specific
      expertise_description: user?.profile.expertise_description || '',
      ideal_mentee_description: user?.profile.ideal_mentee_description || '',
      // URLs (stored in entity_urls table)
      website_url: user?.urls?.website || '',
      linkedin_url: user?.urls?.linkedin || '',
      pitch_vc_url: user?.urls?.pitch_vc || '',
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Common fields */}
        <FormField name="name" />
        <FormField name="title" />
        <FormField name="bio" />

        {/* Conditional fields based on role */}
        {user?.role === 'mentor' && (
          <>
            <FormField name="expertise_description" />
            <FormField name="ideal_mentee_description" />
          </>
        )}

        {/* URL fields (all roles) */}
        <FormField name="website_url" label="Website" />
        <FormField name="linkedin_url" label="LinkedIn Profile" />
        {user?.role === 'mentee' && (
          <FormField name="pitch_vc_url" label="Pitch.vc Profile" />
        )}

        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
```

## 7.8 Calendar Integration (Frontend)

**Calendar Connection Flow:**
```typescript
// apps/web/src/hooks/useCalendar.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { CalendarProvider } from '@shared/types/calendar';

export function useCalendarConnection() {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/sync-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  });
}

export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      if (provider === 'google') {
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/profile?calendar_connected=true`,
            scopes: 'https://www.googleapis.com/auth/calendar',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
      } else {
        // Microsoft OAuth flow
        return supabase.auth.signInWithOAuth({
          provider: 'azure',
          options: {
            redirectTo: `${window.location.origin}/profile?calendar_connected=true`,
            scopes: 'Calendars.ReadWrite offline_access',
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'status'] });
    },
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'status'] });
      
      if (data.warning) {
        addToast({
          title: 'Calendar Disconnected',
          description: data.warning,
          variant: 'warning',
        });
      } else {
        addToast({
          title: 'Calendar Disconnected',
          variant: 'success',
        });
      }
    },
  });
}
```

**Calendar Connection Card:**
```typescript
// apps/web/src/components/features/profile/CalendarConnectionCard.tsx

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertCircle } from 'lucide-react';
import { useCalendarConnection, useConnectCalendar, useDisconnectCalendar } from '@/hooks/useCalendar';

export function CalendarConnectionCard() {
  const { data: status, isLoading } = useCalendarConnection();
  const connectCalendar = useConnectCalendar();
  const disconnectCalendar = useDisconnectCalendar();

  if (isLoading) return <div>Loading...</div>;

  const isConnected = status?.is_connected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="font-semibold">Calendar Integration</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must connect your calendar to create availability or book meetings (FR105).
            </AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Connected: <span className="font-medium">{status.provider}</span>
            </p>
            <p className="text-sm text-gray-600">
              Last synced: {new Date(status.last_sync_at).toLocaleString()}
            </p>
            <Button 
              variant="outline" 
              onClick={() => disconnectCalendar.mutate()}
              disabled={disconnectCalendar.isPending}
            >
              Disconnect Calendar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => connectCalendar.mutate('google')}>
              Connect Google Calendar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => connectCalendar.mutate('microsoft')}
            >
              Connect Outlook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## 7.9 Error Handling & Loading States

**Global Error Boundary:**
```typescript
// apps/web/src/App.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRouter } from '@/router';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
          <Toaster />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Suspense Boundaries for Code Splitting:**
```typescript
// apps/web/src/pages/DashboardPage.tsx

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const BookingList = lazy(() => import('@/components/features/bookings/BookingList'));
const RecommendedMentors = lazy(() => import('@/components/features/discovery/RecommendedMentors'));

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <ErrorBoundary fallback={<div>Failed to load bookings</div>}>
        <Suspense fallback={<LoadingSpinner text="Loading bookings..." />}>
          <BookingList />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Failed to load recommendations</div>}>
        <Suspense fallback={<LoadingSpinner text="Finding mentors..." />}>
          <RecommendedMentors />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

## 7.10 Performance Optimization Strategies

**1. Route-Based Code Splitting:**
All pages lazy loaded via React Router (see Section 7.2)

**2. Component-Level Code Splitting:**
```typescript
// Heavy components loaded on-demand
const BookingWizard = lazy(() => import('@/components/features/bookings/BookingWizard'));
const CoordinatorPanel = lazy(() => import('@/components/features/coordinator/CoordinatorPanel'));
```

**3. Image Optimization:**
```typescript
// apps/web/src/components/common/OptimizedImage.tsx

export function OptimizedImage({ src, alt, ...props }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
```

**4. React Query Prefetching:**
```typescript
// Prefetch data on hover for faster navigation
import { useQueryClient } from '@tanstack/react-query';

function MentorCard({ mentor }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch mentor details
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(mentor.id),
      queryFn: () => getUserById(mentor.id),
    });
  };

  return (
    <Card onMouseEnter={handleMouseEnter}>
      {/* ... */}
    </Card>
  );
}
```

**5. Debounced Search:**
```typescript
// apps/web/src/hooks/useDebouncedSearch.ts

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search component:
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedValue(searchQuery, 300);

const { data } = useQuery({
  queryKey: ['users', 'search', debouncedQuery],
  queryFn: () => searchUsers(debouncedQuery),
  enabled: debouncedQuery.length > 2,
});
```

**6. Optimistic Updates:**
```typescript
// apps/web/src/hooks/useOptimisticBooking.ts

export function useOptimisticCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onMutate: async (bookingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingKeys.my() });

      // Snapshot current data
      const previousBookings = queryClient.getQueryData(bookingKeys.my());

      // Optimistically update
      queryClient.setQueryData(bookingKeys.my(), (old: any) => ({
        ...old,
        bookings: old.bookings.map((booking: any) =>
          booking.id === bookingId
            ? { ...booking, status: 'canceled' }
            : booking
        ),
      }));

      return { previousBookings };
    },
    onError: (err, bookingId, context) => {
      // Rollback on error
      queryClient.setQueryData(bookingKeys.my(), context?.previousBookings);
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
    },
  });
}
```

## 7.11 Environment Configuration

**Environment Variables:**
```typescript
// apps/web/.env.example

# API
VITE_API_BASE_URL=http://localhost:8787/v1

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags (optional)
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
```

**Type-Safe Environment Variables:**
```typescript
// apps/web/src/lib/env.ts

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_REALTIME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  features: {
    realtime: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  },
};
```

## 7.12 Build Configuration

**Vite Configuration:**
```typescript
// apps/web/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Cloudflare Workers during development
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

**TypeScript Configuration:**
```json
// apps/web/tsconfig.json

{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

## 7.13 Testing Strategy (Frontend)

**Unit Tests (Vitest):**
```typescript
// apps/web/src/hooks/useBookings.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useMyBookings } from './useBookings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMyBookings', () => {
  it('fetches bookings successfully', async () => {
    const { result } = renderHook(() => useMyBookings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(3);
  });
});
```

**Component Tests:**
```typescript
// apps/web/src/components/features/bookings/TimeSlotPicker.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimeSlotPicker } from './TimeSlotPicker';

describe('TimeSlotPicker', () => {
  const mockSlots = [
    {
      id: '1',
      start_time: '2025-10-15T14:00:00Z',
      end_time: '2025-10-15T14:30:00Z',
      is_booked: false,
    },
    {
      id: '2',
      start_time: '2025-10-15T15:00:00Z',
      end_time: '2025-10-15T15:30:00Z',
      is_booked: true,
    },
  ];

  it('renders available time slots', () => {
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={vi.fn()} 
      />
    );

    expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
  });

  it('disables booked slots', () => {
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={vi.fn()} 
      />
    );

    const bookedButton = screen.getByText('3:00 PM').closest('button');
    expect(bookedButton).toBeDisabled();
  });

  it('calls onSelectSlot when clicking available slot', () => {
    const onSelectSlot = vi.fn();
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={onSelectSlot} 
      />
    );

    fireEvent.click(screen.getByText('2:00 PM'));
    expect(onSelectSlot).toHaveBeenCalledWith(mockSlots[0]);
  });
});
```

**E2E Tests (Playwright):**
```typescript
// apps/web/e2e/booking-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'mentee@example.com');
    await page.click('button:has-text("Send Magic Link")');
    // ... handle magic link authentication
  });

  test('complete booking from mentor card', async ({ page }) => {
    // Navigate to mentors page
    await page.goto('/mentors');
    await expect(page.locator('h1')).toContainText('Find Mentors');

    // Click first mentor's "Book Now" button
    await page.click('[data-testid="mentor-card"]:first-child button:has-text("Book Now")');

    // Select time slot
    await page.waitForSelector('[data-testid="time-slot-picker"]');
    await page.click('[data-testid="time-slot-button"]:not([disabled]):first-child');

    // Fill booking form
    await page.fill('[name="meeting_goal"]', 'Discuss product-market fit strategy and customer acquisition channels');
    await page.fill('[name="materials_urls"]', 'https://example.com/pitch-deck.pdf');

    // Submit booking
    await page.click('button:has-text("Confirm Booking")');

    // Verify confirmation
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=Your meeting has been scheduled')).toBeVisible();
  });

  test('prevents double booking via realtime update', async ({ page, context }) => {
    // Open two tabs as different users
    const mentee1 = page;
    const mentee2 = await context.newPage();

    // Both navigate to same mentor
    await mentee1.goto('/mentors/mentor-123');
    await mentee2.goto('/mentors/mentor-123');

    // Both select same slot
    const slotSelector = '[data-testid="time-slot-14:00"]';
    await mentee1.click(slotSelector);
    await mentee2.click(slotSelector);

    // Mentee 1 books first
    await mentee1.fill('[name="meeting_goal"]', 'Product strategy discussion');
    await mentee1.click('button:has-text("Confirm Booking")');
    await expect(mentee1.locator('text=Booking Confirmed')).toBeVisible();

    // Mentee 2 tries to book (should see slot disappear via realtime)
    await expect(mentee2.locator(slotSelector)).toBeDisabled({ timeout: 2000 });
  });
});
```

## 7.14 Frontend Security Considerations

**1. XSS Prevention:**
- React escapes content by default
- Use `dangerouslySetInnerHTML` only when absolutely necessary
- Sanitize user input with DOMPurify if rendering HTML

**2. CSRF Protection:**
- Supabase handles CSRF tokens automatically
- API uses JWT bearer tokens (no cookies)

**3. Secure Storage:**
```typescript
// Never store sensitive data in localStorage
// Use Supabase auth for session management (httpOnly cookies)
```

**4. Content Security Policy:**
```html
<!-- apps/web/index.html -->
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io;
  "
>
```

**5. Environment Variable Security:**
- Never commit `.env` files
- Use `.env.example` for documentation
- Prefix public variables with `VITE_`

---
