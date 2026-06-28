/**
 * Secondary class error boundary for non-router render failures. React Router's
 * `errorElement` catches route-element render errors; this boundary catches
 * anything thrown above the router and, for a stale-chunk error, triggers a
 * guarded reload.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-reload';
import { AppErrorFallback } from './AppErrorFallback';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    if (isChunkLoadError(error)) {
      return <AppErrorFallback variant="chunk" />;
    }
    return <AppErrorFallback variant="generic" message={error.message} />;
  }
}
