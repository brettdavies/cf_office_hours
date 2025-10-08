import React, { Suspense, ComponentType } from 'react';

interface IconProps {
  icon: React.LazyExoticComponent<ComponentType<any>>;
  className?: string;
  size?: number | string;
  fallback?: React.ReactNode;
}

/**
 * Reusable Icon component for lazy-loaded Lucide React icons
 *
 * This component handles the Suspense boundary for dynamic icon imports,
 * providing a consistent API for using lazy-loaded icons throughout the app.
 *
 * @example
 * ```tsx
 * import { Icon } from '@/components/ui/Icon';
 * import { CalendarIcon } from '@/utils/icons';
 *
 * function MyComponent() {
 *   return <Icon icon={CalendarIcon} className="w-16 h-16 text-gray-300 mb-4" />;
 * }
 * ```
 */
export function Icon({ icon: IconComponent, className = '', size = 16, fallback = null }: IconProps) {
  return (
    <Suspense fallback={fallback}>
      <IconComponent size={size} className={className} />
    </Suspense>
  );
}

/**
 * Alternative Icon component that provides a default fallback loading indicator
 *
 * @example
 * ```tsx
 * import { LazyIcon } from '@/components/ui/Icon';
 * import { CalendarIcon } from '@/utils/icons';
 *
 * function MyComponent() {
 *   return <LazyIcon icon={CalendarIcon} className="w-4 h-4" />;
 * }
 * ```
 */
export function LazyIcon({
  icon: IconComponent,
  className = '',
  size = 16,
  fallback = <div className="w-4 h-4 animate-pulse bg-gray-200 rounded" />
}: IconProps) {
  return (
    <Suspense fallback={fallback}>
      <IconComponent size={size} className={className} />
    </Suspense>
  );
}