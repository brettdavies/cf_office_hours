import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const CallbackPage = lazy(() => import('@/pages/auth/CallbackPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const AvailabilityPage = lazy(() => import('@/pages/availability/AvailabilityPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CallbackPage />,
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
    ],
  },
]);
