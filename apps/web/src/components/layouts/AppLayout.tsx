import { Outlet } from 'react-router-dom';
import { Header } from './Header';

/**
 * Main application layout wrapper for authenticated routes.
 *
 * Provides consistent header navigation and content area for all protected pages.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
