import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { type Sprint, createSprint } from '../../../services/sprints';
import { useSprints } from '../hooks/useSprintQueries';
import { useModalError } from '../../../hooks/useModalError';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (moveTargetSprintId: number | null) => Promise<void>;
  sprint: Sprint;
  mode: 'complete' | 'cancel';
}

export function CompleteSprintModal({ isOpen, onClose, onConfirm, sprint, mode }: CompleteSprintModalProps) {
  const [moveTarget, setMoveTarget] = useState<'backlog' | 'new_sprint' | 'existing_sprint'>('backlog');
  const [targetSprintId, setTargetSprintId] = useState<number | null>(null);
  const [newSprintName, setNewSprintName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { ErrorBanner, showError, clearError } = useModalError();

  // Fetch planned sprints for moving tasks to
  const { data: sprintsData } = useSprints({ status: ['planned'], limit: 50 });
  const plannedSprints = sprintsData?.data.filter(s => s.id !== sprint.id) || [];

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      clearError();
      setNewSprintName('');
      setTargetSprintId(null);
      setMoveTarget('backlog');
    }
  }, [isOpen, clearError]);

  if (!isOpen) return null;

  const incompleteTasksCount =
    sprint.tasks?.filter(t => !['completed', 'duplicate', 'cancelled'].includes(t.status)).length || 0;
  const totalTasks = sprint.tasks?.length || 0;

  // For cancel mode, we move ALL tasks. For complete mode, only incomplete ones.
  const tasksToMoveCount = mode === 'cancel' ? totalTasks : incompleteTasksCount;
  const actionLabel = mode === 'cancel' ? 'Cancel Sprint' : 'Complete Sprint';
  const actionColor = mode === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90';

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      let finalTargetId: number | null = null;

      if (moveTarget === 'new_sprint') {
        if (!newSprintName.trim()) {
          showError('Please enter a name for the new sprint');
          setIsSubmitting(false);
          return;
        }

        // Create new sprint
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 14);

        const newSprint = await createSprint({
          name: newSprintName,
          status: 'planned',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        finalTargetId = newSprint.id;
      } else if (moveTarget === 'existing_sprint') {
        if (!targetSprintId) {
          showError('Please select a sprint');
          setIsSubmitting(false);
          return;
        }
        finalTargetId = targetSprintId;
      }
      // If 'backlog', finalTargetId remains null

      await onConfirm(finalTargetId);
      // Wait for onConfirm to finish before closing (it returns promise)

      onClose();
    } catch (error) {
      console.error(error);
      // toast.error('Failed to process request'); // SprintsPage handles error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg bg-white dark:bg-[#1C252E] rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {mode === 'cancel' && <Trash2 className="w-5 h-5 text-red-500" />}
              {actionLabel}: {sprint.name}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            {mode === 'cancel' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to cancel this sprint? This action cannot be undone.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Complete this sprint and verify task progress.
              </p>
            )}

            {(tasksToMoveCount > 0) && (
              <div className={`border rounded-lg p-4 mb-4 ${mode === 'cancel' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'}`}>
                <div className="flex gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${mode === 'cancel' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${mode === 'cancel' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                      {mode === 'cancel' ? 'Move All Tasks' : 'Incomplete Tasks'}
                    </p>
                    <p className={`text-xs mt-1 ${mode === 'cancel' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                      Select where to move the {tasksToMoveCount} {mode === 'complete' ? 'incomplete ' : ''}tasks:
                    </p>

                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="moveTarget"
                          value="backlog"
                          checked={moveTarget === 'backlog'}
                          onChange={() => setMoveTarget('backlog')}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Move to Backlog</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="moveTarget"
                          value="new_sprint"
                          checked={moveTarget === 'new_sprint'}
                          onChange={() => setMoveTarget('new_sprint')}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Move to New Sprint</span>
                      </label>

                      {moveTarget === 'new_sprint' && (
                        <div className="ml-6 mt-1">
                          <input
                            type="text"
                            value={newSprintName}
                            onChange={(e) => setNewSprintName(e.target.value)}
                            placeholder="New Sprint Name"
                            className="w-full text-sm px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="moveTarget"
                          value="existing_sprint"
                          checked={moveTarget === 'existing_sprint'}
                          onChange={() => setMoveTarget('existing_sprint')}
                          className="text-primary focus:ring-primary"
                          disabled={plannedSprints.length === 0}
                        />
                        <span className={`text-sm ${plannedSprints.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          Move to existing sprint
                        </span>
                      </label>

                      {moveTarget === 'existing_sprint' && (
                        <div className="mt-2 ml-6">
                          <SearchableSelect
                            options={plannedSprints.map(s => ({ value: s.id.toString(), label: s.name }))}
                            value={targetSprintId?.toString() || ''}
                            onChange={(val: string) => setTargetSprintId(Number(val))}
                            placeholder="Select sprint..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tasksToMoveCount === 0 && mode === 'cancel' && (
              <div className="text-sm text-gray-500 italic">No tasks to move. Sprint will be deleted.</div>
            )}
            {tasksToMoveCount === 0 && mode === 'complete' && (
              <div className="text-sm text-green-600 dark:text-green-400">All tasks completed! Great job.</div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 ${actionColor}`}
            >
              {isSubmitting ? 'Processing...' : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
