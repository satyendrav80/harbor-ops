import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ApiErr = { id: number; message: string; data?: any };

export function GlobalApiError() {
  const [errors, setErrors] = useState<ApiErr[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let idCounter = 1;
    function onError(e: any) {
      const errorData = e?.detail?.data;
      let message = e?.detail?.message || 'Request failed';
      
      // Build detailed message if incompleteTasks or invalidTasks are present
      let detailedMessage = message;
      if (errorData) {
        const incompleteTasks = errorData.incompleteTasks || [];
        const invalidTasks = errorData.invalidTasks || [];
        
        // Use the message field from errorData if it exists (it's more descriptive)
        if (errorData.message) {
          detailedMessage = errorData.message;
        }
        
        if (incompleteTasks.length > 0) {
          const taskList = incompleteTasks
            .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
            .join(', ');
          detailedMessage = `${detailedMessage} Incomplete tasks: ${taskList}`;
        } else if (invalidTasks.length > 0) {
          const taskList = invalidTasks
            .map((task: any) => `Task #${task.id} (${task.status === 'not_found' ? 'not found' : task.status})`)
            .join(', ');
          detailedMessage = `${detailedMessage} Invalid tasks: ${taskList}`;
        }
      }
      
      // de-dupe if same message already visible
      const id = idCounter++;
      setErrors((prev) => (prev.some((x) => x.message === detailedMessage) ? prev : [...prev, { id, message: detailedMessage, data: errorData }]));
      // Auto-dismiss after 8s for detailed errors, 6s for simple ones
      setTimeout(() => {
        setErrors((prev) => prev.filter((x) => x.id !== id));
      }, (errorData?.incompleteTasks || errorData?.invalidTasks) ? 8000 : 6000);
    }
    window.addEventListener('api-error', onError as EventListener);
    return () => window.removeEventListener('api-error', onError as EventListener);
  }, []);

  if (!mounted || errors.length === 0) return null;

  const content = (
    <div className="fixed top-3 right-3 z-[400] w-[90%] max-w-sm space-y-2 pointer-events-none">
      {errors.map((err) => (
        <div key={err.id} className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 shadow transition-transform pointer-events-auto">
          <div className="text-sm text-red-800 dark:text-red-200 flex-1 whitespace-pre-wrap">{err.message}</div>
          <button
            className="text-red-600 dark:text-red-300 hover:underline text-xs flex-shrink-0"
            onClick={() => setErrors((prev) => prev.filter((x) => x.id !== err.id))}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );

  return createPortal(content, document.body);
}


