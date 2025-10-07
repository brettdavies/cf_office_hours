/**
 * Availability management page for mentors.
 *
 * Displays list of availability blocks and allows mentors to create new ones.
 * Shows date, time range, location, and booking status for each block.
 */

// External dependencies
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

// Internal modules
import { apiClient, ApiError } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { CreateAvailabilityDialog } from '@/components/features/availability/CreateAvailabilityDialog';
import { useToast } from '@/hooks/use-toast';

// Types
import type { paths } from '@shared/types/api.generated';

type GetAvailabilityResponse =
  paths['/v1/availability']['get']['responses']['200']['content']['application/json'];
type AvailabilityBlock = GetAvailabilityResponse[number];

export default function AvailabilityPage() {
  // 1. Hooks
  const { toast } = useToast();
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Effects
  useEffect(() => {
    fetchAvailability();
  }, []);

  // 3. Event handlers
  const fetchAvailability = async () => {
    setIsLoading(true);
    setError(null);

    if (import.meta.env.DEV) {
      console.log('[AVAILABILITY] Fetching availability blocks', {
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const data = await apiClient.getMyAvailability();

      if (import.meta.env.DEV) {
        console.log('[AVAILABILITY] Availability blocks fetched successfully', {
          blockCount: data.length,
          timestamp: new Date().toISOString(),
        });
      }

      setAvailability(data);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AVAILABILITY] Failed to fetch availability', {
          error: err,
          timestamp: new Date().toISOString(),
        });
      }

      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load availability';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    fetchAvailability();
  };

  // 4. Render logic
  const formatDisplayDate = (isoDateTime: string): string => {
    try {
      return format(parseISO(isoDateTime), 'MMM d, yyyy');
    } catch {
      return isoDateTime;
    }
  };

  const formatTimeFromISO = (isoDateTime: string): string => {
    try {
      // Extract time from ISO datetime (e.g., '2025-10-15T09:00:00Z' -> '09:00')
      const match = isoDateTime.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : format(parseISO(isoDateTime), 'HH:mm');
    } catch {
      return isoDateTime;
    }
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    return `${formatTimeFromISO(startTime)} - ${formatTimeFromISO(endTime)}`;
  };

  const getLocationDisplay = (block: AvailabilityBlock): string => {
    if (block.location_custom) return block.location_custom;
    if (block.location_preset_id) return block.location_preset_id;
    return block.meeting_type === 'online' ? 'Online' : 'TBD';
  };

  // 5. Return JSX
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Availability</h1>
        <CreateAvailabilityDialog onSuccess={handleCreateSuccess} />
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading availability...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {!isLoading && !error && availability.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven't created any availability blocks yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Click "Create Availability" to get started.
          </p>
        </div>
      )}

      {!isLoading && !error && availability.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availability.map(block => (
            <Card key={block.id} className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">{formatDisplayDate(block.start_time)}</h3>
                  <span className="text-sm text-muted-foreground capitalize">
                    {block.meeting_type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(block.start_time, block.end_time)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Location:</span> {getLocationDisplay(block)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
