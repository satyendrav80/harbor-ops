/**
 * Searchable Single Select Component
 * A searchable dropdown for single selection with keyboard navigation
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useOverlayStack } from './overlay/OverlayStackProvider';

type SearchableSelectProps = {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  dropdownPlacement?: 'bottom' | 'top';
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  dropdownPlacement = 'bottom',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { register } = useOverlayStack();
  const [popoverZ, setPopoverZ] = useState<number | null>(null);
  const unregisterRef = useRef<(() => void) | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [resolvedPlacement, setResolvedPlacement] = useState<'top' | 'bottom'>(dropdownPlacement);

  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : [];
  
  // Filter options based on search query
  const filteredOptions = safeOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find selected option
  const selectedOption = safeOptions.find((opt) => opt.value === value);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Register with overlay stack for proper z-index and ESC behavior
  useEffect(() => {
    if (!isOpen) {
      unregisterRef.current?.();
      unregisterRef.current = null;
      setPopoverZ(null);
      return;
    }
    const reg = register('popover', {
      closeOnEscape: true,
      onClose: () => {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      },
    });
    unregisterRef.current = reg.unregister;
    setPopoverZ(reg.zIndexContent);
    return () => {
      reg.unregister();
      unregisterRef.current = null;
      setPopoverZ(null);
    };
  }, [isOpen, register]);

  // Calculate dropdown position (portal, fixed)
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updatePosition = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const VIEWPORT_PAD = 8;
      const GAP = 4;
      const MIN_HEIGHT = 160;
      const MAX_HEIGHT = 320;

      const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PAD;
      const spaceAbove = rect.top - VIEWPORT_PAD;

      const desired = dropdownPlacement;
      const DESIRED_HEIGHT = 320;
      const openUp =
        desired === 'top' ||
        (desired === 'bottom' && spaceBelow < DESIRED_HEIGHT && spaceAbove > spaceBelow);

      setResolvedPlacement(openUp ? 'top' : 'bottom');

      const rawAvailable = openUp ? spaceAbove : spaceBelow;
      const available = Math.max(
        0,
        Math.min(rawAvailable, viewportHeight - VIEWPORT_PAD * 2)
      );

      const maxHeight =
        available <= MIN_HEIGHT ? available : Math.min(available, MAX_HEIGHT);

      if (openUp) {
        // Anchor dropdown's bottom directly to the top of the trigger
        const bottom = viewportHeight - rect.top + GAP;

        setDropdownStyle({
          position: 'fixed',
          bottom,
          left: rect.left,
          width: rect.width,
          maxHeight,
        });
      } else {
        // Normal downwards dropdown anchored by top
        const top = rect.bottom + GAP;

        setDropdownStyle({
          position: 'fixed',
          top,
          left: rect.left,
          width: rect.width,
          maxHeight,
        });
      }
    };
    updatePosition();
    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, dropdownPlacement]);

  // Close dropdown when clicking outside (consider portal)
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleListItemClick = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    handleSelect(optionValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        e.stopPropagation();
        break;

      default:
        if (!isOpen && e.key.length === 1) {
          setIsOpen(true);
          setSearchQuery(e.key);
        }
        break;
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={selectedOption ? '' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              ...dropdownStyle,
              zIndex: popoverZ ?? 200,
            }}
            className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col max-h-[inherit]">
              {/* When opening downward, keep search at the top */}
              {resolvedPlacement === 'bottom' && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700/50">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Search..."
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              <ul
                ref={listRef}
                className="overflow-y-auto py-1 flex-1"
                style={{ maxHeight: dropdownStyle.maxHeight }}
                role="listbox"
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No options found
                  </li>
                ) : (
                  filteredOptions.map((option, index) => (
                    <li
                      key={option.value}
                      onClick={(e) => handleListItemClick(e, option.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                        index === highlightedIndex
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      } ${option.value === value ? 'font-medium' : ''}`}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      <span>{option.label}</span>
                      {option.value === value && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </li>
                  ))
                )}
              </ul>

              {/* When opening upward, move search to the bottom so it's near the trigger */}
              {resolvedPlacement === 'top' && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700/50">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Search..."
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

