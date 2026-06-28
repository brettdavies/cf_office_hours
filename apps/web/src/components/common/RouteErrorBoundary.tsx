/**
 * React Router `errorElement` that replaces the built-in "Unexpected Application
 * Error!" screen. A `React.lazy` rejection thrown during route-element render is
 * caught here; when it is a stale-chunk error the boundary triggers a guarded
 * reload, otherwise it shows a recoverable fallback.
 */

import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-reload';
import { AppErrorFallback } from './AppErrorFallback';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const isChunk = isChunkLoadError(error);

  useEffect(() => {
    if (isChunk) {
      reloadOnceForChunkError();
    }
  }, [isChunk]);

  if (isChunk) {
    return <AppErrorFallback variant="chunk" />;
  }

  const message = error instanceof Error ? error.message : undefined;
  return <AppErrorFallback variant="generic" message={message} />;
}
