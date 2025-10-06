import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Navigation links component with role-based display.
 *
 * Shows different navigation options based on user role:
 * - Mentors see "My Availability"
 * - Mentees/Coordinators see "Browse Mentors"
 */
export function Navigation() {
  const { user } = useAuth();
  const role = user?.role;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? 'text-primary' : 'text-gray-600'
    }`;

  return (
    <nav className="hidden md:flex items-center gap-6">
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
    </nav>
  );
}
