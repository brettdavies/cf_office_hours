/**
 * Algorithm Selector Component
 *
 * Allows coordinators to switch between different matching algorithms.
 * Displays algorithm version badge and tooltip with algorithm description.
 */

// External dependencies


// Internal modules
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGetAlgorithms } from '@/hooks/useMatching';
import type { AlgorithmInfo } from '@shared/schemas/matching';

interface AlgorithmSelectorProps {
  value: string;
  onChange: (algorithmVersion: string) => void;
}

export function AlgorithmSelector({
  value,
  onChange,
}: AlgorithmSelectorProps) {
  const { data: algorithmsData, isLoading, error } = useGetAlgorithms();

  // Convert API data to component format (already sorted alphabetically by backend)
  const algorithms = algorithmsData?.algorithms.map((alg: AlgorithmInfo) => ({
    value: alg.version,
    label: alg.label,
    description: alg.description,
  })) || [];
  const selectedAlgorithm = algorithms.find((a) => a.value === value);

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="algorithm-select">Matching Algorithm</Label>
          <div className="flex items-center justify-center h-10 w-full border border-input bg-background rounded-md">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading algorithms...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || algorithms.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="algorithm-select">Matching Algorithm</Label>
          <div className="flex items-center justify-center h-10 w-full border border-destructive bg-destructive/10 rounded-md">
            <span className="text-sm text-destructive">
              {error ? 'Failed to load algorithms' : 'No algorithms available'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Algorithm Dropdown */}
      <div>
        <Label htmlFor="algorithm-select">Matching Algorithm</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="algorithm-select" className="w-full">
            <SelectValue placeholder="Select algorithm..." />
          </SelectTrigger>
          <SelectContent>
            {algorithms.map((algorithm) => (
              <SelectItem key={algorithm.value} value={algorithm.value}>
                {algorithm.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Algorithm Version Badge with Tooltip */}
      {selectedAlgorithm && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Algorithm:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">
                  {selectedAlgorithm.value}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-semibold mb-1">{selectedAlgorithm.label}</p>
                <p className="text-sm">{selectedAlgorithm.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
