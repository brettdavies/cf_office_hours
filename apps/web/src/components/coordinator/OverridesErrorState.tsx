/**
 * Overrides Error State Component
 *
 * Displays error alert with retry button when tier override requests fail to load.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface OverridesErrorStateProps {
  /** Callback when Retry button is clicked */
  onRetry: () => void;
}

/**
 * Error state for tier override requests page.
 * Shows error alert with retry action.
 */
export function OverridesErrorState({ onRetry }: OverridesErrorStateProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load override requests.{' '}
          <Button variant="link" onClick={onRetry} className="p-0 h-auto">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
