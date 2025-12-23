import { ReactNode } from 'react';

type ModalErrorBannerProps = {
  message?: string | null;
  children?: ReactNode;
};

/**
 * Standard inline error banner for use inside modals.
 */
export function ModalErrorBanner({ message, children }: ModalErrorBannerProps) {
  const content = children ?? message;
  if (!content) return null;

  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
      <p className="text-sm text-red-800 dark:text-red-200">{content}</p>
    </div>
  );
}


