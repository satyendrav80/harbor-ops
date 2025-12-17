/**
 * Group By Builder Component
 * Reusable component for building multi-level grouping configurations
 */

import { Plus, X, ArrowUpDown } from 'lucide-react';
import type { FilterFieldMetadata, GroupByItem } from '../../../features/release-notes/types/filters';

type GroupByBuilderProps = {
  fields: FilterFieldMetadata[];
  value: GroupByItem[];
  onChange: (groupBy: GroupByItem[]) => void;
};

export function GroupByBuilder({ fields, value, onChange }: GroupByBuilderProps) {
  // Use value prop directly - fully controlled component
  const groupByItems = Array.isArray(value) ? value : [];

  // Get only groupable fields
  const groupableFields = fields.filter(f => f.groupable);

  const handleAdd = () => {
    const newItem: GroupByItem = {
      key: groupableFields[0]?.key || '',
      direction: 'asc', // Default to asc
    };
    onChange([...groupByItems, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(groupByItems.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: string) => {
    onChange(
      groupByItems.map((item, i) =>
        i === index ? { ...item, key } : item
      )
    );
  };

  const handleDirectionChange = (index: number, direction: 'asc' | 'desc') => {
    onChange(
      groupByItems.map((item, i) =>
        i === index ? { ...item, direction } : item
      )
    );
  };

  if (groupableFields.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No groupable fields available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group By</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Level
        </button>
      </div>

      {groupByItems.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          No grouping levels. Click "Add Level" to group results.
        </div>
      ) : (
        <div className="space-y-2">
          {groupByItems.map((item, index) => {
            const selectedField = groupableFields.find(f => f.key === item.key);
            return (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {index + 1}.
                </span>
                <select
                  value={item.key}
                  onChange={(e) => handleFieldChange(index, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {groupableFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDirectionChange(index, item.direction === 'asc' ? 'desc' : 'asc')}
                  className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                    item.direction === 'asc'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                  }`}
                  title={item.direction === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {item.direction === 'asc' ? 'A→Z' : 'Z→A'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

