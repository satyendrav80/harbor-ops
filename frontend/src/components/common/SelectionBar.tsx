import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

type SelectionBarOption = { value: string; label: string };

type SelectionBarProps = {
  count: number;
  options: SelectionBarOption[];
  onApply: (value: string | null) => void;
  onCancel: () => void;
  placeholder?: string;
  applyLabel?: string;
  leftContent?: React.ReactNode;
};

export function SelectionBar({
  count,
  options,
  onApply,
  onCancel,
  placeholder = 'Select...',
  applyLabel = 'Apply',
  leftContent,
}: SelectionBarProps) {
  const [value, setValue] = useState<string>('');

  const handleApply = () => {
    onApply(value === '' ? null : value);
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-[#1C252E] shadow-xl border border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 flex items-center gap-4">
      {leftContent ? (
        leftContent
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span>{count} selected</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="min-w-[180px]">
          <SearchableSelect
            options={options}
            value={value}
            onChange={setValue}
            placeholder={placeholder}
            className="text-sm"
            dropdownPlacement="top"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={value === undefined}
          className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {applyLabel}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

