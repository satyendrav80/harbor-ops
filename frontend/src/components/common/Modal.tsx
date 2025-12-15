import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOverlayStack } from './overlay/OverlayStackProvider';

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
  const { register } = useOverlayStack();
  const unregisterRef = useRef<(() => void) | null>(null);
  const [zBackdrop, setZBackdrop] = useState<number | null>(null);
  const [zContent, setZContent] = useState<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
  }, [isOpen, register]);

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
      <div className="fixed inset-0 bg-black/50" style={{ zIndex: zBackdrop ?? 60 }} onClick={onClose}>
        <div
          ref={modalRef}
          className="bg-white dark:bg-[#1C252E] shadow-lg h-full flex flex-col lg:ml-64" // Sidebar width (w-64 = 256px) only on desktop
          style={{ zIndex: zContent ?? 61 }}
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
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50"
      style={{ zIndex: zBackdrop ?? 60 }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-[#1C252E] rounded-xl shadow-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}
        style={{ zIndex: zContent ?? 61 }}
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

