import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
};

/**
 * Reusable Modal component
 */
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press - close dropdowns first, then modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Check if any dropdown is open within the modal
        // SearchableMultiSelect and other dropdowns typically have a data attribute or class when open
        const modalElement = modalRef.current;
        if (!modalElement) return;

        // Check for open dropdowns by looking for elements with dropdown indicators
        // SearchableMultiSelect sets data-dropdown-open="true" when open
        const openDropdowns = modalElement.querySelectorAll('[data-dropdown-open="true"]');
        
        if (openDropdowns.length > 0) {
          // Dropdown is open - let SearchableMultiSelect handle ESC (it will stop propagation)
          // The dropdown's ESC handler will close it and stop propagation, preventing modal close
          return;
        }

        // No dropdown open, close the modal
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  // For full-width modal, position from sidebar edge (256px) to right edge
  // On mobile (< lg), sidebar is hidden so modal takes full width
  // On desktop (>= lg), sidebar is always visible at 256px width
  if (size === 'full') {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose}>
        <div
          ref={modalRef}
          className="bg-white dark:bg-[#1C252E] shadow-lg h-full flex flex-col lg:ml-64" // Sidebar width (w-64 = 256px) only on desktop
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        ref={modalRef}
        className={`bg-white dark:bg-[#1C252E] rounded-xl shadow-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>{children}</div>
      </div>
    </div>
  );
}

