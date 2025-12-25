import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { RichTextEditor } from '../../../components/common/RichTextEditor';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { TaskSelectionModal } from '../../tasks/components/TaskSelectionModal';
import { useCreateReleaseNote, useUpdateReleaseNote } from '../hooks/useReleaseNoteMutations';
import { useTasksByIds } from '../../tasks/hooks/useTaskQueries';
import type { ReleaseNote } from '../../../services/releaseNotes';
import type { Service } from '../../../services/services';
import type { Task } from '../../../services/tasks';
import { X } from 'lucide-react';
import dayjs from '../../../utils/dayjs';
import { toDateTimeLocalValue, fromDateTimeLocalValueToIso } from '../../../utils/dateTime';
import { useQuery } from '@tanstack/react-query';
import { listReleaseNotesAdvanced } from '../../../services/releaseNotes';
import { isEmptyHtml } from '../../../utils/richText';
import { useMemo } from 'react';
import { useModalError } from '../../../hooks/useModalError';

type ReleaseNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  releaseNote?: ReleaseNote | null;
  services: Service[];
};

const releaseNoteSchema = z.object({
  serviceId: z.number().min(1, 'Service is required'),
  note: z.string()
    .min(1, 'Release note is required')
    .max(5000, 'Release note must be 5000 characters or less')
    .refine((val) => !isEmptyHtml(val), {
      message: 'Release note cannot be empty',
    }),
  publishDate: z.string().min(1, 'Publish date is required'),
});

type ReleaseNoteFormValues = z.infer<typeof releaseNoteSchema>;

export function ReleaseNoteModal({ isOpen, onClose, releaseNote, services }: ReleaseNoteModalProps) {
  const isEditing = !!releaseNote;
  const { error, showError, clearError, ErrorBanner } = useModalError();
  const createReleaseNote = useCreateReleaseNote({
    mode: 'inline',
    suppressSuccessToast: true,
    onErrorMessage: (msg) => showError(msg, 'Failed to create release note'),
  });
  const updateReleaseNote = useUpdateReleaseNote({
    mode: 'inline',
    suppressSuccessToast: true,
    onErrorMessage: (msg) => showError(msg, 'Failed to update release note'),
  });
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [isTaskSelectionModalOpen, setIsTaskSelectionModalOpen] = useState(false);

  const form = useForm<ReleaseNoteFormValues>({
    resolver: zodResolver(releaseNoteSchema),
    defaultValues: {
      serviceId: releaseNote?.serviceId || 0,
      note: releaseNote?.note || '',
      publishDate: releaseNote?.publishDate
        ? toDateTimeLocalValue(releaseNote.publishDate)
        : dayjs().format('YYYY-MM-DDTHH:mm'),
    },
  });

  const normalizeServiceId = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const numericValue = typeof value === 'string' ? Number(value) : value;
    return typeof numericValue === 'number' && Number.isFinite(numericValue) && numericValue > 0
      ? numericValue
      : null;
  };

  const watchedServiceId = form.watch('serviceId');
  const normalizedServiceId = normalizeServiceId(watchedServiceId);
  const selectedService = useMemo(() => {
    if (!normalizedServiceId) return null;
    return services.find((service) => service.id === normalizedServiceId) || null;
  }, [services, normalizedServiceId]);

  // Reset form when modal opens/closes or releaseNote changes
  useEffect(() => {
    if (isOpen) {
      if (releaseNote) {
        form.reset({
          serviceId: releaseNote.serviceId,
          note: releaseNote.note,
          publishDate: releaseNote.publishDate
            ? toDateTimeLocalValue(releaseNote.publishDate)
            : dayjs().format('YYYY-MM-DDTHH:mm'),
        });
        // Set selected tasks from release note
        setSelectedTaskIds(releaseNote.tasks?.map((t) => t.task.id) || []);
      } else {
        form.reset({
          serviceId: 0,
          note: '',
          publishDate: dayjs().format('YYYY-MM-DDTHH:mm'),
        });
        setSelectedTaskIds([]);
      }
      clearError();
    } else {
      setSelectedTaskIds([]);
      setIsTaskSelectionModalOpen(false);
      clearError();
      form.reset({
        serviceId: 0,
        note: '',
        publishDate: dayjs().format('YYYY-MM-DDTHH:mm'),
      });
    }
  }, [isOpen, releaseNote, form, clearError]);

  const onSubmit = async (values: ReleaseNoteFormValues) => {
    // Clear local validation error
    clearError();
    try {
      // Convert datetime-local input value to ISO string (UTC) for backend
      const publishDateIso = fromDateTimeLocalValueToIso(values.publishDate);
      if (!publishDateIso) {
        // Keep inline error only for client-side validation issues
        showError('Invalid publish date');
        return;
      }

      if (isEditing && releaseNote) {
        await updateReleaseNote.mutateAsync({
          id: releaseNote.id,
          note: values.note,
          publishDate: publishDateIso,
          serviceId: values.serviceId,
          taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        });
      } else {
        await createReleaseNote.mutateAsync({
          serviceId: values.serviceId,
          note: values.note,
          publishDate: publishDateIso,
          taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          serviceId: 0,
          note: '',
          publishDate: dayjs().format('YYYY-MM-DDTHH:mm'),
        });
        setSelectedTaskIds([]);
      }
      onClose();
    } catch (err: any) {
      // Fall back to a generic inline error if something unexpected happens
      showError(err, `Failed to ${isEditing ? 'update' : 'create'} release note`);
    }
  };

  // Build preloaded tasks map from release note data (for immediate display)
  const preloadedTasksMap = useMemo(() => {
    if (!releaseNote?.tasks) return new Map<number, Partial<Task>>();
    const map = new Map<number, Partial<Task>>();
    releaseNote.tasks.forEach((rt) => {
      const task = rt.task;
      const normalizedServiceId =
        typeof task.serviceId === 'number'
          ? task.serviceId
          : task.service?.id ?? null;
      // Convert release note task format to partial Task format
      // This provides immediate display while full data is fetched
      map.set(task.id, {
        id: task.id,
        title: task.title,
        description: task.description || null,
        type: task.type as Task['type'],
        status: task.status as Task['status'],
        sprintId: task.sprint?.id || null,
        sprint: task.sprint
          ? {
              id: task.sprint.id,
              name: task.sprint.name,
              status: task.sprint.status,
            }
          : null,
        serviceId: normalizedServiceId,
        service: task.service
          ? {
              id: task.service.id,
              name: task.service.name,
            }
          : normalizedServiceId
          ? {
              id: normalizedServiceId,
              name: task.service?.name || releaseNote.service?.name || 'Service',
            }
          : null,
      });
    });
    return map;
  }, [releaseNote]);

  // Find task IDs that need to be fetched (not in preloaded map)
  const taskIdsToFetch = useMemo(() => {
    return selectedTaskIds.filter((id) => !preloadedTasksMap.has(id));
  }, [selectedTaskIds, preloadedTasksMap]);

  // Fetch missing tasks by IDs
  const { data: fetchedTasks = [], isLoading: isLoadingTasks } = useTasksByIds(taskIdsToFetch);

  // Merge preloaded and fetched tasks
  const selectedTasks = useMemo(() => {
    const tasks: Task[] = [];
    const taskMap = new Map<number, Task | Partial<Task>>();
    
    // Add preloaded tasks (partial data from release note)
    preloadedTasksMap.forEach((task) => {
      if (task.id) {
        taskMap.set(task.id, task);
      }
    });
    
    // Add fetched tasks (full data - will override preloaded)
    fetchedTasks.forEach((task) => {
      taskMap.set(task.id, task);
    });
    
    // Return tasks in the order of selectedTaskIds
    selectedTaskIds.forEach((id) => {
      const task = taskMap.get(id);
      if (task && task.id && task.title) {
        // Ensure we have at least id and title before adding
        tasks.push(task as Task);
      }
    });
    
    return tasks;
  }, [preloadedTasksMap, fetchedTasks, selectedTaskIds]);

  // Fetch tasks already linked to non-deployed release notes (pending or deployment_started)
  const { data: blockedTaskIds = [] } = useQuery({
    queryKey: ['release-notes', 'tasks-in-active-notes'],
    enabled: isTaskSelectionModalOpen,
    queryFn: async () => {
      const res = await listReleaseNotesAdvanced({
        filters: {
          condition: 'or',
          childs: [
            { key: 'status', operator: 'eq', value: 'pending' },
            { key: 'status', operator: 'eq', value: 'deployment_started' },
          ],
        },
        page: 1,
        limit: 500,
      });
      const tasks = res.data.flatMap((rn) => rn.tasks || []);
      const ids = tasks.map((t) => t.task.id);
      // Allow tasks already on this release note (when editing)
      const allowedIds = new Set(releaseNote?.tasks?.map((t) => t.task.id) || []);
      return ids.filter((id) => !allowedIds.has(id));
    },
  });

  const handleTaskSelectionConfirm = (taskIds: number[]) => {
    // Merge with existing selection so previously-added tasks remain visible/removable
    setSelectedTaskIds((prev) => {
      const merged = new Set(prev);
      taskIds.forEach((id) => merged.add(id));
      // Also keep tasks that were previously selected but not in the new list (so user can remove)
      return Array.from(merged);
    });
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
                selectedIds={watchedServiceId ? [watchedServiceId] : []}
                onChange={(selectedIds) => {
                  // Only allow single selection - take the last selected item (most recently clicked)
                  const lastSelected = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
                  const normalizedId = normalizeServiceId(lastSelected);
                  form.setValue('serviceId', normalizedId ?? 0, { shouldDirty: true });
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
              submitShortcut="mod-enter"
              onSend={() => form.handleSubmit(onSubmit)()}
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
        allowedStatuses={['completed', 'testing']}
        excludedTaskIds={blockedTaskIds}
        alwaysIncludeTasks={selectedTasks}
        serviceId={normalizedServiceId}
        serviceName={selectedService?.name}
        servicePort={selectedService?.port}
        excludeReleaseNoteId={releaseNote?.id ?? null}
      />
    </Modal>
  );
}

