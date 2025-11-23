import { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

type Option = {
  id: number;
  name: string;
};

type SearchableMultiSelectProps = {
  options: Option[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Reusable searchable multi-select component
 */
export function SearchableMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Search and select...',
  label,
  disabled = false,
  className = '',
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));

  // Reset highlighted index when search changes or dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }, [searchQuery, isOpen]);

  const handleToggle = (optionId: number) => {
    if (disabled) return;
    const newSelectedIds = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onChange(newSelectedIds);
  };

  const handleRemove = (optionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedIds.filter((id) => id !== optionId));
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        event.stopPropagation(); // Prevent modal from closing
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          // Scroll into view
          const optionElement = containerRef.current?.querySelector(
            `[data-option-index="${next}"]`
          ) as HTMLElement;
          if (optionElement) {
            optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return next;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          // Scroll into view
          const optionElement = containerRef.current?.querySelector(
            `[data-option-index="${next}"]`
          ) as HTMLElement;
          if (optionElement) {
            optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return next;
        });
        return;
      }

      if (event.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        event.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) {
          const newSelectedIds = selectedIds.includes(option.id)
            ? selectedIds.filter((id) => id !== option.id)
            : [...selectedIds, option.id];
          onChange(newSelectedIds);
        }
        return;
      }

      if (event.key === ' ' && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        event.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) {
          const newSelectedIds = selectedIds.includes(option.id)
            ? selectedIds.filter((id) => id !== option.id)
            : [...selectedIds, option.id];
          onChange(newSelectedIds);
        }
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, filteredOptions, highlightedIndex, selectedIds, onChange]);

  return (
    <div className={`relative ${className}`} ref={containerRef} data-dropdown-open={isOpen}>
      {label && (
        <label className="flex flex-col mb-2">
          <span className="text-sm font-medium leading-normal text-gray-900 dark:text-white">{label}</span>
        </label>
      )}
      <div
        className={`relative flex w-full min-h-[2.5rem] rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] px-3 py-2 cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-gray-600'
        } ${isOpen ? 'ring-2 ring-primary/50 border-primary' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {/* Selected items display */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-y-auto max-h-20">
          {selectedOptions.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-gray-500 py-1">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded border border-primary/20 flex-shrink-0"
              >
                <span className="truncate max-w-[120px]">{option.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.id, e)}
                    className="hover:text-primary/80 focus:outline-none flex-shrink-0"
                    aria-label={`Remove ${option.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {!disabled && (
          <div className="flex items-center gap-2 ml-2">
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-lg max-h-[200px] overflow-hidden">
          {/* Search input */}
          <div className="sticky top-0 p-2 bg-white dark:bg-[#1C252E] border-b border-gray-200 dark:border-gray-700/50 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Prevent default behavior for arrow keys in search input
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    // Focus will move to options via the document-level handler
                  }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-[140px]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedIds.includes(option.id);
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-option-index={index}
                    onClick={() => handleToggle(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                      isHighlighted
                        ? 'bg-primary/10 text-primary'
                        : isSelected
                        ? 'bg-primary/5 text-primary hover:bg-primary/10'
                        : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1">{option.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

