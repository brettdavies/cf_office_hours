/**
 * Overrides Sorting Control Component
 *
 * Dropdown selector for sorting tier override requests.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
export type SortOption =
  | 'time_pending_asc'
  | 'time_pending_desc'
  | 'expiration_asc'
  | 'expiration_desc'
  | 'mentee_name_asc'
  | 'mentee_name_desc'
  | 'mentor_name_asc'
  | 'mentor_name_desc'
  | 'match_score_asc'
  | 'match_score_desc';

export const SORT_LABELS: Record<SortOption, string> = {
  time_pending_asc: 'Time Pending (Oldest First)',
  time_pending_desc: 'Time Pending (Newest First)',
  expiration_asc: 'Time Until Expiration (Soonest First)',
  expiration_desc: 'Time Until Expiration (Latest First)',
  mentee_name_asc: 'Mentee Name (A-Z)',
  mentee_name_desc: 'Mentee Name (Z-A)',
  mentor_name_asc: 'Mentor Name (A-Z)',
  mentor_name_desc: 'Mentor Name (Z-A)',
  match_score_asc: 'Match Score (Lowest First)',
  match_score_desc: 'Match Score (Highest First)',
};

interface OverridesSortingControlProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

/**
 * Sorting dropdown for tier override requests.
 * Provides 10 sort options including time, name, and match score.
 */
export function OverridesSortingControl({ sortBy, onSortChange }: OverridesSortingControlProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Sort by:</label>
      <Select value={sortBy} onValueChange={value => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[280px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
