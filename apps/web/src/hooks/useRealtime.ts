/**
 * Realtime hooks for Supabase subscriptions.
 *
 * Provides real-time updates for bookings and other resources
 * using Supabase Realtime with React Query cache invalidation.
 */

// External dependencies
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";

// Internal modules
import { bookingKeys } from "./useMyBookings";
import { toast } from "@/hooks/use-toast";

/**
 * Subscribe to real-time updates for user's bookings.
 *
 * Subscribes to changes in the bookings table where user is
 * either mentor or mentee. Automatically invalidates React Query
 * cache to trigger refetch of bookings data.
 *
 * Shows toast notification when booking is canceled by other party.
 *
 * @param userId - Current user's ID to filter subscriptions
 *
 * @example
 * function DashboardPage() {
 *   const { user } = useAuth();
 *   useMyBookingsRealtime(user?.id);
 *   // Bookings will automatically update when changes occur
 * }
 */
export function useMyBookingsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Subscribe to bookings table changes for current user
    const channel = supabase
      .channel("my_bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `or(mentor_id.eq.${userId},mentee_id.eq.${userId})`,
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log("[Realtime] Booking change detected:", payload);
          }

          // Invalidate bookings cache to trigger refetch
          queryClient.invalidateQueries({ queryKey: bookingKeys.my() });

          // Show notification if booking was canceled
          if (
            payload.eventType === "UPDATE" && payload.new.status === "canceled"
          ) {
            toast({
              title: "Booking Cancelled",
              description: "One of your meetings was cancelled.",
              variant: "error",
            });
          }

          // Show notification if new booking was created
          if (payload.eventType === "INSERT") {
            toast({
              title: "New Booking",
              description: "A new meeting has been scheduled.",
            });
          }
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
