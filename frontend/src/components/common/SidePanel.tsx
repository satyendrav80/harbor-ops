/**
 * Side Panel Component
 * Similar to Jira's advanced filter panel
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOverlayStack } from './overlay/OverlayStackProvider';

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /**
   * Changing stackKey forces re-registration so the panel rises to top.
   */
  stackKey?: string | number | null;
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
export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  stackKey,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { register } = useOverlayStack();
  const unregisterRef = useRef<(() => void) | null>(null);
  const [zBackdrop, setZBackdrop] = useState<number | null>(null);
  const [zContent, setZContent] = useState<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Register with overlay stack for z-index + ESC handling
  useEffect(() => {
    if (!isOpen) {
      unregisterRef.current?.();
      unregisterRef.current = null;
      setZBackdrop(null);
      setZContent(null);
      return;
    }
    const reg = register('overlay', {
      onClose: () => onCloseRef.current(),
      closeOnEscape: true,
    });
    unregisterRef.current = reg.unregister;
    setZBackdrop(reg.zIndexBackdrop ?? null);
    setZContent(reg.zIndexContent);
    return () => {
      reg.unregister();
      unregisterRef.current = null;
      setZBackdrop(null);
      setZContent(null);
    };
  }, [isOpen, register, stackKey]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: zBackdrop ?? 190 }}
        onClick={() => onCloseRef.current()}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full bg-white dark:bg-[#1C252E] shadow-xl flex flex-col ${widthClasses[width]} transition-transform`}
        style={{ zIndex: zContent ?? 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={() => onCloseRef.current()}
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

