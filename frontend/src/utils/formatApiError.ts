export function formatApiError(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage;

  // If it's already a string, use it
  if (typeof error === 'string') return error;

  // Common error shapes: Error, AxiosError, Fetch error, custom API error
  const anyError = error as any;

  // Prefer explicit message on nested response/data objects
  const nestedMessage =
    anyError?.response?.data?.message ??
    anyError?.data?.message ??
    anyError?.message;

  if (typeof nestedMessage === 'string' && nestedMessage.trim().length > 0) {
    return nestedMessage;
  }

  return fallbackMessage;
}


