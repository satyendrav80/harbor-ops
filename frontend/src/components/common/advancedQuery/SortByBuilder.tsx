/**
 * Sort By Builder Component
 * Reusable component for building multi-level sorting configurations
 */

import { useState } from 'react';
import { Plus, X, ArrowUpDown } from 'lucide-react';
import type { FilterFieldMetadata, OrderByItem } from '../../../features/release-notes/types/filters';

type SortByBuilderProps = {
  fields: FilterFieldMetadata[];
  value: OrderByItem[];
  onChange: (orderBy: OrderByItem[]) => void;
};

export function SortByBuilder({ fields, value, onChange }: SortByBuilderProps) {
  const [sortItems, setSortItems] = useState<OrderByItem[]>(
    Array.isArray(value) ? value : value ? [value] : []
  );

  // Get only sortable fields
  const sortableFields = fields.filter(f => f.sortable);

  const handleAdd = () => {
    const newItem: OrderByItem = {
      key: sortableFields[0]?.key || '',
      direction: 'asc', // Default to asc
    };
    const updated = [...sortItems, newItem];
    setSortItems(updated);
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = sortItems.filter((_, i) => i !== index);
    setSortItems(updated);
    onChange(updated);
  };

  const handleFieldChange = (index: number, key: string) => {
    const selectedField = sortableFields.find(f => f.key === key);
    const updated = sortItems.map((item, i) =>
      i === index ? { ...item, key, type: selectedField?.type } : item
    );
    setSortItems(updated);
    onChange(updated);
  };

  const handleDirectionChange = (index: number, direction: 'asc' | 'desc') => {
    const updated = sortItems.map((item, i) =>
      i === index ? { ...item, direction } : item
    );
    setSortItems(updated);
    onChange(updated);
  };

  if (sortableFields.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No sortable fields available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Sort
        </button>
      </div>

      {sortItems.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          No sort criteria. Click "Add Sort" to sort results.
        </div>
      ) : (
        <div className="space-y-2">
          {sortItems.map((item, index) => {
            const selectedField = sortableFields.find(f => f.key === item.key);
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
                  {sortableFields.map((field) => (
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

