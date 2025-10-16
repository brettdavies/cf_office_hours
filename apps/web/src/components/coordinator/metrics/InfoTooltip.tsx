/**
 * InfoTooltip Component
 *
 * Displays an info icon that opens a modal with metric explanation.
 * Includes: what the metric is, why it's tracked, how it's calculated.
 */

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface MetricInfo {
  what: string;
  why: string;
  how: string;
}

interface InfoTooltipProps {
  metricInfo?: MetricInfo;
}

export function InfoTooltip({ metricInfo }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  if (!metricInfo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
          aria-label="Learn more about this metric"
        >
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Metric Information</DialogTitle>
          <DialogDescription>
            Understanding this metric and how it helps monitor platform health
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">What is this metric?</h4>
            <p className="text-sm text-muted-foreground">{metricInfo.what}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Why are we tracking it?</h4>
            <p className="text-sm text-muted-foreground">{metricInfo.why}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">How is it calculated?</h4>
            <p className="text-sm text-muted-foreground">{metricInfo.how}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
