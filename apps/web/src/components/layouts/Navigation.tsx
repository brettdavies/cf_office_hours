import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Navigation links component with role-based display.
 *
 * Shows different navigation options based on user role:
 * - Mentors see "My Availability"
 * - Coordinators see "Find Matches"
 * - Mentees see "Browse Mentors"
 */
export function Navigation() {
  const { data: user } = useCurrentUser();
  const role = user?.role;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? 'text-primary' : 'text-gray-600'
    }`;

  return (
    <nav className="flex items-center gap-6" data-testid="navigation">
      <NavLink to="/dashboard" className={navLinkClass}>
        Home
      </NavLink>

      <NavLink to="/profile" className={navLinkClass}>
        My Profile
      </NavLink>

      {role === 'mentor' ? (
        <NavLink to="/availability" className={navLinkClass}>
          My Availability
        </NavLink>
      ) : role === 'coordinator' ? (
        <>
          <NavLink to="/coordinator/matching" className={navLinkClass}>
            Find Matches
          </NavLink>
          <NavLink to="/coordinator/metrics" className={navLinkClass}>
            Metrics
          </NavLink>
          <NavLink to="/coordinator/overrides" className={navLinkClass}>
            Overrides
          </NavLink>
        </>
      ) : (
        <NavLink to="/mentors" className={navLinkClass}>
          Browse Mentors
        </NavLink>
      )}
    </nav>
  );
}
