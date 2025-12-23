import { useCallback, useMemo, useState } from 'react';
import { ModalErrorBanner } from '../components/common/ModalErrorBanner';
import { formatApiError } from '../utils/formatApiError';

export type ModalErrorInput = string | Error | unknown | null | undefined;

export function useModalError() {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const showError = useCallback((input: ModalErrorInput, fallback?: string) => {
    if (!input && !fallback) {
      setError(null);
      return;
    }

    if (typeof input === 'string') {
      setError(input);
      return;
    }

    const message = formatApiError(input, fallback ?? 'Something went wrong');
    setError(message);
  }, []);

  const ErrorBanner = useMemo(
    () => <ModalErrorBanner message={error} />,
    [error],
  );

  return {
    error,
    setError,
    clearError,
    showError,
    ErrorBanner,
  };
}


