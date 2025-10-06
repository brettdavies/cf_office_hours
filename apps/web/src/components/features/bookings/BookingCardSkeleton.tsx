/**
 * BookingCardSkeleton Component
 *
 * Loading skeleton for BookingCard while data is being fetched.
 */

// Internal modules
import { Card } from '@/components/ui/card';

/**
 * Animated skeleton loader for BookingCard.
 *
 * Displays placeholder elements that mimic the BookingCard layout
 * with pulse animation to indicate loading state.
 */
export function BookingCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4 animate-pulse">
        {/* Avatar Skeleton */}
        <div className="w-12 h-12 rounded-full bg-gray-200" />

        {/* Content Skeleton */}
        <div className="flex-1 space-y-3">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>

          {/* Date/Time Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>

          {/* Meeting Goal Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}
