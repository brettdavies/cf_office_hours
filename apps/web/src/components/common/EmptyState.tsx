/**
 * Empty State Component
 *
 * Displays a friendly message when no data is available.
 * Includes icon, title, and optional description.
 */

// External dependencies
import { LucideIcon } from 'lucide-react';

// Types
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/**
 * EmptyState displays a centered message when no content is available.
 *
 * @param icon - Lucide icon component to display
 * @param title - Main heading text
 * @param description - Optional descriptive text
 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
    </div>
  );
}
