import { Navigation } from './Navigation';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';

/**
 * Application header with branding, navigation, and user menu.
 *
 * Provides sticky top navigation bar with:
 * - Application branding
 * - Desktop navigation links
 * - Mobile menu (hamburger)
 * - User menu with logout
 */
export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900">CF Office Hours</h1>
            <Navigation />
          </div>
          <div className="flex items-center gap-4">
            <UserMenu />
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
