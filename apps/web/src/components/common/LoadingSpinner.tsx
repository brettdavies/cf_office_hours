/**
 * Loading Spinner Component
 *
 * Displays a loading spinner with optional text.
 * Supports multiple sizes.
 */

// External dependencies
import { Loader2 } from 'lucide-react';

// Types
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * LoadingSpinner displays an animated loading indicator.
 *
 * @param size - Spinner size (sm, md, lg, default: md)
 * @param text - Optional loading text to display below spinner
 */
export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`${sizeClass} animate-spin text-blue-600`} />
      {text && <p className="mt-3 text-sm text-gray-600">{text}</p>}
    </div>
  );
}
