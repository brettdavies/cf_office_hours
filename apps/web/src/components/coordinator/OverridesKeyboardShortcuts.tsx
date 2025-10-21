/**
 * Overrides Keyboard Shortcuts Help Panel Component
 *
 * Displays keyboard shortcut reference for tier override request management.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OverridesKeyboardShortcutsProps {
  /** Whether the shortcuts panel is visible */
  show: boolean;
}

/**
 * Keyboard shortcuts help panel showing all available hotkeys.
 * Displays navigation, selection, and action shortcuts in a grid layout.
 */
export function OverridesKeyboardShortcuts({ show }: OverridesKeyboardShortcutsProps) {
  if (!show) {
    return null;
  }

  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200">
      <AlertDescription>
        <div className="flex items-start justify-between">
          <div>
            <strong className="font-semibold block mb-2">Keyboard Shortcuts</strong>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↑↓←→</kbd>
                <span className="ml-2">Navigate cards</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Space</kbd>
                <span className="ml-2">Toggle selection</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl/Cmd+A</kbd>
                <span className="ml-2">Select/Deselect all</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Enter</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">A</kbd>
                <span className="ml-2">Approve</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Del</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">D</kbd>
                <span className="ml-2">Decline</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Esc</kbd>
                <span className="ml-2">Clear selection</span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">?</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">/</kbd>
                <span className="ml-2">Toggle this help</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Enter/Del keys work on focused card or all selected cards
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
