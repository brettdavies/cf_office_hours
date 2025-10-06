import { Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

/**
 * Mobile navigation menu with hamburger icon.
 *
 * Displays navigation links in a side drawer for mobile devices.
 */
export function MobileMenu() {
  const { user } = useAuth();
  const role = user?.role;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="mt-6 flex flex-col gap-2">
          <NavLink to="/profile" className={navLinkClass}>
            My Profile
          </NavLink>

          <NavLink to="/dashboard" className={navLinkClass}>
            My Bookings
          </NavLink>

          {role === 'mentor' ? (
            <NavLink to="/availability" className={navLinkClass}>
              My Availability
            </NavLink>
          ) : (
            <NavLink to="/mentors" className={navLinkClass}>
              Browse Mentors
            </NavLink>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
