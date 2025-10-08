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

interface Algorithm {
  value: string;
  label: string;
  description: string;
}

interface AlgorithmSelectorProps {
  value: string;
  onChange: (algorithmVersion: string) => void;
  algorithms?: Algorithm[];
}

// Default algorithms (initially just Tag-Based V1, extensible for future algorithms)
const defaultAlgorithms: Algorithm[] = [
  {
    value: 'tag-based-v1',
    label: 'Tag-Based V1',
    description: '60% tag overlap + 20% stage match + 20% reputation compatibility',
  },
];

export function AlgorithmSelector({
  value,
  onChange,
  algorithms = defaultAlgorithms,
}: AlgorithmSelectorProps) {
  const selectedAlgorithm = algorithms.find((a) => a.value === value);

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
