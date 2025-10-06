import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const CallbackPage = lazy(() => import('@/pages/auth/CallbackPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const AvailabilityPage = lazy(() => import('@/pages/availability/AvailabilityPage'));
const MentorProfilePage = lazy(() => import('@/pages/mentors/MentorProfilePage'));

// Placeholder for Browse Mentors page (to be implemented)
const BrowseMentorsPage = lazy(() => import('@/pages/mentors/BrowseMentorsPage').catch(() => ({
  default: () => <div className="p-4">Browse Mentors - Coming Soon</div>
})));

export const router = createBrowserRouter([
  // Root redirects to dashboard
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  // Auth routes (public)
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'callback',
        element: <CallbackPage />,
      },
    ],
  },
  // Protected routes with AppLayout
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'availability',
        element: <AvailabilityPage />,
      },
      {
        path: 'mentors',
        element: <BrowseMentorsPage />,
      },
      {
        path: 'mentors/:mentorId',
        element: <MentorProfilePage />,
      },
    ],
  },
]);
