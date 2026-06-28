/**
 * Recoverable full-screen error fallback shared by the route and class error
 * boundaries. The Reload button calls `window.location.reload()` directly: an
 * explicit user action bypasses the chunk-reload loop guard because it cannot
 * loop on its own.
 */

import { Button } from '@/components/ui/button';

interface AppErrorFallbackProps {
  variant: 'chunk' | 'generic';
  message?: string;
}

export function AppErrorFallback({ variant, message }: AppErrorFallbackProps) {
  const title = variant === 'chunk' ? 'A new version is available' : 'Something went wrong';
  const body =
    variant === 'chunk'
      ? 'The app was updated. Reload to get the latest version.'
      : message || 'An unexpected error occurred.';

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center"
    >
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  );
}
