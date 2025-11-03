import { useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

type ConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
};

/**
 * Reusable Confirmation Dialog component
 * Provides a better UX than window.confirm() with consistent styling
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600',
      titleColor: 'text-red-900 dark:text-red-100',
      border: 'border-red-200 dark:border-red-800',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonBg: 'bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    info: {
      icon: AlertTriangle,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600',
      titleColor: 'text-blue-900 dark:text-blue-100',
      border: 'border-blue-200 dark:border-blue-800',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className={`relative bg-white dark:bg-[#1C252E] rounded-lg shadow-xl max-w-md w-full border ${styles.border} animate-in fade-in-0 zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6">
          <div className={`flex-shrink-0 ${styles.iconBg} rounded-full p-2.5`}>
            <Icon className={`w-6 h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`text-lg font-semibold ${styles.titleColor} mb-2`}>
                {title}
              </h3>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-[#151A1F] border-t border-gray-200 dark:border-gray-700/50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1C252E] focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

