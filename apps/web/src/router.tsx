import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const CallbackPage = lazy(() => import('@/pages/auth/CallbackPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const AvailabilityPage = lazy(() => import('@/pages/availability/AvailabilityPage'));
const MentorProfilePage = lazy(() => import('@/pages/mentors/MentorProfilePage'));

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
  // Protected routes
  {
    element: <ProtectedRoute />,
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
        path: 'mentors/:mentorId',
        element: <MentorProfilePage />,
      },
    ],
  },
]);
