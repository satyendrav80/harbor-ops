import toast from 'react-hot-toast';
import { formatApiError } from '../utils/formatApiError';

export type MutationFeedbackMode = 'toast' | 'inline' | 'both';

export type MutationFeedbackConfig = {
  mode?: MutationFeedbackMode;
  /**
   * Called with the resolved error message when mode includes 'inline'.
   */
  onErrorMessage?: (message: string) => void;
  /**
   * If true, success toasts are suppressed even when mode includes 'toast'.
   */
  suppressSuccessToast?: boolean;
};

export type MutationFeedbackOptions = {
  fallbackErrorMessage: string;
  successMessage?: string;
};

export function useMutationFeedback(
  feedback: MutationFeedbackConfig | undefined,
  options: MutationFeedbackOptions,
) {
  const mode: MutationFeedbackMode = feedback?.mode ?? 'toast';

  const handleError = (error: unknown) => {
    const message = formatApiError(error, options.fallbackErrorMessage);

    if (mode === 'toast' || mode === 'both') {
      toast.error(message);
    }
    if ((mode === 'inline' || mode === 'both') && feedback?.onErrorMessage) {
      feedback.onErrorMessage(message);
    }
  };

  const handleSuccess = () => {
    if (!options.successMessage) return;
    if ((mode === 'toast' || mode === 'both') && !feedback?.suppressSuccessToast) {
      toast.success(options.successMessage);
    }
  };

  return { handleError, handleSuccess };
}


