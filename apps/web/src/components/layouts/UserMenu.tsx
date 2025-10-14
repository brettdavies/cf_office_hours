import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLogout } from '@/hooks/useLogout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { lazy, Suspense } from 'react';

// Component-specific dynamic import for better code splitting
const LogOutIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.LogOut })));

/**
 * User menu dropdown with avatar and logout functionality.
 *
 * Displays user email and provides logout action.
 */
export function UserMenu() {
  const { data: user } = useCurrentUser();
  const { logout } = useLogout();

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <Suspense fallback={<div className="mr-2 h-4 w-4 bg-gray-200 animate-pulse rounded" />}>
            <LogOutIcon className="mr-2 h-4 w-4" />
          </Suspense>
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
