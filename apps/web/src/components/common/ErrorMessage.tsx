/**
 * Error Message Component
 *
 * Displays an error message with optional retry button.
 * Used for handling API errors gracefully.
 */

// External dependencies
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Types
interface ErrorMessageProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * ErrorMessage displays a user-friendly error with optional retry action.
 *
 * @param title - Error title/heading
 * @param message - Detailed error message (optional)
 * @param onRetry - Callback function for retry button (optional)
 * @param retryLabel - Text for retry button (default: "Retry")
 */
export function ErrorMessage({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-lg bg-red-50 p-6 max-w-md w-full">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-red-800">{title}</h3>
            {message && <p className="mt-2 text-sm text-red-700">{message}</p>}
            {onRetry && (
              <div className="mt-4">
                <Button onClick={onRetry} variant="outline" size="sm">
                  {retryLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
