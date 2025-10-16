/**
 * MetricSection Component
 *
 * Collapsible section wrapper for grouping related metrics and charts.
 * Supports expand/collapse with smooth animations.
 */

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function MetricSection({ title, children, defaultExpanded = true }: MetricSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Collapse
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              Expand
            </>
          )}
        </Button>
      </div>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}
