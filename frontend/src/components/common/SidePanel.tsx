/**
 * Side Panel Component
 * Similar to Jira's advanced filter panel
 */

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
};

const widthClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[28rem]',
  xl: 'w-[32rem]',
  '2xl': 'w-[40rem]',
  '3xl': 'w-[48rem]',
};

/**
 * Side Panel component for advanced filters
 */
export function SidePanel({ isOpen, onClose, title, children, width = 'md' }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  // Only closes if no confirmation dialogs or other modals are open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const panelElement = panelRef.current;
        if (!panelElement) return;

        // Check for open dropdowns
        const openDropdowns = panelElement.querySelectorAll('[data-dropdown-open="true"]');
        if (openDropdowns.length > 0) {
          return;
        }

        // Check for open confirmation dialogs or modals with higher z-index
        // This is a generic check that works for any modal/dialog component
        // We check for elements with z-index >= 60 (ConfirmationDialog uses z-[60])
        // This ensures modals/dialogs close first, then the side panel on second ESC
        const openModals = document.querySelectorAll(
          '[class*="z-[60]"], [class*="z-[70]"], [class*="z-[80]"], [class*="z-[90]"], [class*="z-[100]"]'
        );
        // Filter to only check elements that are actually visible (not hidden)
        const visibleModals = Array.from(openModals).filter(
          (el) => el instanceof HTMLElement && window.getComputedStyle(el).display !== 'none'
        );
        if (visibleModals.length > 0) {
          // Let the modal/dialog handle ESC first
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    // Use bubble phase (not capture) so confirmation dialogs handle ESC first
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full z-50 bg-white dark:bg-[#1C252E] shadow-xl flex flex-col ${widthClasses[width]} transition-transform`}
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
    </>
  );
}

