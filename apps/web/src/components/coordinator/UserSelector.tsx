/**
 * User Selector Component
 *
 * Allows coordinators to select a user (mentor or mentee) to find matches for.
 * Includes search/filter functionality and displays a preview card of the selected user.
 */

// External dependencies
import { useState, useEffect } from 'react';

// Internal modules
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { UserCard } from './UserCard';

// Types
import type { paths } from '@shared/types/api.generated';

type MatchUser =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number]['user'];

interface UserSelectorProps {
  value: string | null;
  onChange: (userId: string, targetRole: 'mentor' | 'mentee') => void;
}

export function UserSelector({ value, onChange }: UserSelectorProps) {
  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'mentor' | 'mentee'>('all');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    if (import.meta.env.DEV) {
      console.log('[CoordinatorMatching] Fetching users', {
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Fetch all users (we'll filter client-side for now)
      // TODO: Update API client to support /v1/users endpoint with role filtering
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        console.log('[CoordinatorMatching] Users fetched', {
          count: data?.length || 0,
          timestamp: new Date().toISOString(),
        });
      }

      setUsers(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);

      if (import.meta.env.DEV) {
        console.error('[CoordinatorMatching] Error fetching users:', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search term and role filter
  const filteredUsers = users.filter((user) => {
    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }

    // Search filter (by name or email)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const name = user.profile?.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return name.includes(lowerSearch) || email.includes(lowerSearch);
    }

    return true;
  });

  // Get selected user
  const selectedUser = users.find((u) => u.id === value);

  // Handle user selection
  const handleSelect = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      // Target role is the opposite of the selected user's role
      const targetRole = user.role === 'mentor' ? 'mentee' : 'mentor';

      if (import.meta.env.DEV) {
        console.log('[CoordinatorMatching] User selected', {
          userId,
          userRole: user.role,
          targetRole,
          timestamp: new Date().toISOString(),
        });
      }

      onChange(userId, targetRole);
    }
  };

  return (
    <div className="space-y-4">
      {/* Role Filter */}
      <div>
        <Label htmlFor="role-filter">Filter by Role</Label>
        <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as typeof roleFilter)}>
          <SelectTrigger id="role-filter" className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="mentor">Mentors Only</SelectItem>
            <SelectItem value="mentee">Mentees Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Dropdown with integrated search */}
      <div>
        <Label htmlFor="user-select">Select User</Label>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading users...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : (
          <Select value={value || undefined} onValueChange={handleSelect}>
            <SelectTrigger id="user-select" className="w-full">
              <SelectValue placeholder="Select a user..." />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.profile?.name || user.email} ({user.role})
                    </SelectItem>
                  ))
                )}
              </div>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected User Card */}
      {selectedUser && (
        <div>
          <Label>Selected User</Label>
          <UserCard user={selectedUser} className="mt-2" />
        </div>
      )}
    </div>
  );
}
