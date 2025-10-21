/**
 * Overrides Loading State Component
 *
 * Displays skeleton loading UI while tier override requests are being fetched.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for tier override requests page.
 * Shows header skeleton and grid of card skeletons.
 */
export function OverridesLoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-10 w-96 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}
