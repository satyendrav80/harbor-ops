import { memo } from 'react';
import { X } from 'lucide-react';

export type BulkAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary' | 'success' | 'warning';
  disabled?: boolean;
  show?: boolean;
};

type BulkSelectionToolbarProps = {
  totalCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClearSelection: () => void;
  actions?: BulkAction[];
  isProcessing?: boolean;
  className?: string;
};

/**
 * Reusable bulk selection toolbar component that combines:
 * - Select all checkbox (when no items selected)
 * - Selection count and bulk actions (when items selected)
 */
export const BulkSelectionToolbar = memo(({
  totalCount,
  selectedCount,
  isAllSelected,
  onSelectAll,
  onDeselectAll,
  onClearSelection,
  actions = [],
  isProcessing = false,
  className = '',
}: BulkSelectionToolbarProps) => {
  if (totalCount === 0) return null;

  const hasSelection = selectedCount > 0;
  const visibleActions = actions.filter((action) => action.show !== false);

  // Determine background and border based on selection state
  const containerClasses = hasSelection
    ? `mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-lg ${className}`
    : `mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between">
        {/* Left side: Select all checkbox and selection info */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll();
                } else {
                  onDeselectAll();
                }
              }}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isAllSelected ? 'Deselect all' : 'Select all'} ({totalCount} {totalCount === 1 ? 'item' : 'items'})
            </span>
          </label>
          {hasSelection && (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </span>
              <button
                onClick={onClearSelection}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                disabled={isProcessing}
              >
                Clear selection
              </button>
            </>
          )}
        </div>

        {/* Right side: Bulk action buttons */}
        {hasSelection && visibleActions.length > 0 && (
          <div className="flex items-center gap-2">
            {visibleActions.map((action) => {
              const variantClasses = {
                default: 'text-gray-600 dark:text-gray-400 bg-white dark:bg-[#1C252E] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5',
                danger: 'text-red-600 dark:text-red-400 bg-white dark:bg-[#1C252E] border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20',
                primary: 'text-primary bg-white dark:bg-[#1C252E] border-primary/30 dark:border-primary/40 hover:bg-primary/10 dark:hover:bg-primary/20',
                success: 'text-green-600 dark:text-green-400 bg-white dark:bg-[#1C252E] border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20',
                warning: 'text-yellow-600 dark:text-yellow-400 bg-white dark:bg-[#1C252E] border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
              };

              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={isProcessing || action.disabled}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                    variantClasses[action.variant || 'default']
                  }`}
                >
                  {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

BulkSelectionToolbar.displayName = 'BulkSelectionToolbar';

