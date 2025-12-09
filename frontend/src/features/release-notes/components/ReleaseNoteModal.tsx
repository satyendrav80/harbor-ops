import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { RichTextEditor } from '../../../components/common/RichTextEditor';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { TaskSelectionModal } from '../../tasks/components/TaskSelectionModal';
import { useCreateReleaseNote, useUpdateReleaseNote } from '../hooks/useReleaseNoteMutations';
import { useTasks } from '../../tasks/hooks/useTaskQueries';
import type { ReleaseNote } from '../../../services/releaseNotes';
import type { Service } from '../../../services/services';
import { X } from 'lucide-react';

type ReleaseNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  releaseNote?: ReleaseNote | null;
  services: Service[];
};

const releaseNoteSchema = z.object({
  serviceId: z.number().min(1, 'Service is required'),
  note: z.string().min(1, 'Release note is required').max(5000, 'Release note must be 5000 characters or less'),
  publishDate: z.string().min(1, 'Publish date is required'),
});

type ReleaseNoteFormValues = z.infer<typeof releaseNoteSchema>;

export function ReleaseNoteModal({ isOpen, onClose, releaseNote, services }: ReleaseNoteModalProps) {
  const isEditing = !!releaseNote;
  const createReleaseNote = useCreateReleaseNote();
  const updateReleaseNote = useUpdateReleaseNote();
  
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [isTaskSelectionModalOpen, setIsTaskSelectionModalOpen] = useState(false);

  const form = useForm<ReleaseNoteFormValues>({
    resolver: zodResolver(releaseNoteSchema),
    defaultValues: {
      serviceId: releaseNote?.serviceId || 0,
      note: releaseNote?.note || '',
      publishDate: releaseNote?.publishDate
        ? new Date(releaseNote.publishDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    },
  });

  // Reset form when modal opens/closes or releaseNote changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (releaseNote) {
      form.reset({
        serviceId: releaseNote.serviceId,
        note: releaseNote.note,
        publishDate: releaseNote.publishDate
          ? new Date(releaseNote.publishDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
      // Set selected tasks from release note
      setSelectedTaskIds(releaseNote.tasks?.map(t => t.task.id) || []);
    } else {
      form.reset({
        serviceId: 0,
        note: '',
        publishDate: new Date().toISOString().slice(0, 16),
      });
      setSelectedTaskIds([]);
    }
    setError(null);
  }, [isOpen, releaseNote, form]);

  const onSubmit = async (values: ReleaseNoteFormValues) => {
    setError(null);
    try {
      if (isEditing && releaseNote) {
        await updateReleaseNote.mutateAsync({
          id: releaseNote.id,
          note: values.note,
          publishDate: values.publishDate,
          serviceId: values.serviceId,
          taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        });
      } else {
        await createReleaseNote.mutateAsync({
          serviceId: values.serviceId,
          note: values.note,
          publishDate: values.publishDate,
          taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          serviceId: 0,
          note: '',
          publishDate: new Date().toISOString().slice(0, 16),
        });
        setSelectedTaskIds([]);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} release note`);
    }
  };

  // Fetch selected tasks for display
  const { data: selectedTasksData } = useTasks({
    limit: 1000,
  });

  const selectedTasks = selectedTasksData?.data?.filter(task => selectedTaskIds.includes(task.id)) || [];

  const handleTaskSelectionConfirm = (taskIds: number[]) => {
    // Replace selection with what user selected in modal
    setSelectedTaskIds(taskIds);
  };

  const handleRemoveTask = (taskId: number) => {
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const isLoading = createReleaseNote.isPending || updateReleaseNote.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Release Note' : 'Create Release Note'} size="full">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="space-y-4 flex-shrink-0">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Service Selection (shown for both create and edit) */}
            <div>
              <SearchableMultiSelect
                options={services.map((service) => ({
                  id: service.id,
                  name: `${service.name} (:${service.port})`,
                }))}
                selectedIds={form.watch('serviceId') ? [form.watch('serviceId')] : []}
                onChange={(selectedIds) => {
                  // Only allow single selection - take the last selected item (most recently clicked)
                  const serviceId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : 0;
                  form.setValue('serviceId', serviceId, { shouldDirty: true });
                }}
                label="Service *"
                placeholder="Search and select a service..."
                disabled={isLoading}
              />
              {form.formState.errors.serviceId && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.serviceId.message}
                </p>
              )}
            </div>

            {/* Publish Date */}
            <div>
              <label htmlFor="publish-date" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Publish Date *
              </label>
              <input
                id="publish-date"
                type="datetime-local"
                {...form.register('publishDate')}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              />
              {form.formState.errors.publishDate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.publishDate.message}</p>
              )}
            </div>

            {/* Task Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  Related Tasks
                </label>
                <button
                  type="button"
                  onClick={() => setIsTaskSelectionModalOpen(true)}
                  disabled={isLoading}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  + Add Tasks
                </button>
              </div>
              
              {/* Selected Tasks Display */}
              {selectedTasks.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg min-h-[60px]">
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                    >
                      <span className="text-base">
                        {task.type === 'bug' && '🐛'}
                        {task.type === 'feature' && '✨'}
                        {task.type === 'todo' && '📝'}
                        {task.type === 'epic' && '🎯'}
                        {task.type === 'improvement' && '⚡'}
                      </span>
                      <span className="text-gray-900 dark:text-white">{task.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
                        disabled={isLoading}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedTasks.length === 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-sm text-gray-500 dark:text-gray-400 min-h-[60px] flex items-center">
                  No tasks selected. Click "Add Tasks" to link tasks to this release note.
                </div>
              )}
            </div>
          </div>

          {/* Release Note - Expands to fill remaining space */}
          <div className="flex-1 flex flex-col min-h-0 mt-4">
            <RichTextEditor
              value={form.watch('note') || ''}
              onChange={(value) => form.setValue('note', value, { shouldDirty: true })}
              label="Release Note *"
              placeholder="Enter release note description..."
              error={form.formState.errors.note?.message}
              disabled={isLoading}
              maxHeight="100%"
              className="flex-1 flex flex-col min-h-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      {/* Task Selection Modal */}
      <TaskSelectionModal
        isOpen={isTaskSelectionModalOpen}
        onClose={() => setIsTaskSelectionModalOpen(false)}
        onConfirm={handleTaskSelectionConfirm}
        title="Select Tasks for Release Note"
        initialSelectedIds={selectedTaskIds}
        showAllTasks={true}
      />
    </Modal>
  );
}

