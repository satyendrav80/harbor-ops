import { useEffect, useState } from 'react';

type ApiErr = { id: number; message: string };

export function GlobalApiError() {
  const [errors, setErrors] = useState<ApiErr[]>([]);

  useEffect(() => {
    let idCounter = 1;
    function onError(e: any) {
      const message = e?.detail?.message || 'Request failed';
      // de-dupe if same message already visible
      const id = idCounter++;
      setErrors((prev) => (prev.some((x) => x.message === message) ? prev : [...prev, { id, message }]));
      // Auto-dismiss after 6s
      setTimeout(() => {
        setErrors((prev) => prev.filter((x) => x.id !== id));
      }, 6000);
    }
    window.addEventListener('api-error', onError as EventListener);
    return () => window.removeEventListener('api-error', onError as EventListener);
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-[60] w-[90%] max-w-sm space-y-2">
      {errors.map((err) => (
        <div key={err.id} className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 shadow transition-transform">
          <div className="text-sm text-red-800 dark:text-red-200 flex-1">{err.message}</div>
          <button
            className="text-red-600 dark:text-red-300 hover:underline text-xs"
            onClick={() => setErrors((prev) => prev.filter((x) => x.id !== err.id))}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}


