/**
 * Dialog component for creating new availability blocks.
 *
 * Provides a form for mentors to specify when they are available for meetings.
 * Validates input and creates availability block with auto-generated time slots.
 */

// External dependencies
import { useState } from 'react';
import { format } from 'date-fns';

// Internal modules
import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

// Types
import type { paths } from '@shared/types/api.generated';

type CreateAvailabilityRequest = NonNullable<
  paths['/v1/availability']['post']['requestBody']
>['content']['application/json'];

interface CreateAvailabilityDialogProps {
  onSuccess?: () => void;
}

export function CreateAvailabilityDialog({ onSuccess }: CreateAvailabilityDialogProps) {
  // 1. Hooks
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [slotDuration, setSlotDuration] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 2. Event handlers
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = 'Date is required';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        newErrors.date = 'Date must be today or in the future';
      }
    }

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (!slotDuration) {
      newErrors.slotDuration = 'Slot duration is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setDate(undefined);
    setStartTime('');
    setEndTime('');
    setSlotDuration('');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!date) return; // TypeScript guard

    setIsSubmitting(true);

    try {
      // Combine date + time into ISO datetime strings
      const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`).toISOString();

      const endDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${endTime}:00`).toISOString();

      const requestData: CreateAvailabilityRequest = {
        start_time: startDateTime,
        end_time: endDateTime,
        slot_duration_minutes: parseInt(slotDuration, 10),
        buffer_minutes: 0,
        meeting_type: 'online',
        description: '',
      };

      await apiClient.createAvailability(requestData);

      toast({
        title: 'Success',
        description: 'Availability block created successfully',
      });

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create availability:', error);

      const errorMessage =
        error instanceof ApiError
          ? error.message
          : 'Failed to create availability. Please try again.';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setOpen(false);
  };

  // 3. Render
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Availability</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Availability Block</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={date => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className="rounded-md border"
            />
            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              aria-describedby="start-time-help"
            />
            <p id="start-time-help" className="text-sm text-muted-foreground">
              When availability begins (24-hour format)
            </p>
            {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              aria-describedby="end-time-help"
            />
            <p id="end-time-help" className="text-sm text-muted-foreground">
              When availability ends (24-hour format)
            </p>
            {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
          </div>

          {/* Slot Duration */}
          <div className="space-y-2">
            <Label htmlFor="slot-duration">Slot Duration</Label>
            <Select value={slotDuration} onValueChange={setSlotDuration}>
              <SelectTrigger id="slot-duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Length of each individual meeting slot</p>
            {errors.slotDuration && <p className="text-sm text-red-500">{errors.slotDuration}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
