import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTaskMutations';
import { getTags } from '../../../services/tags';
import { getUsers } from '../../../services/users';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { useAuth } from '../../auth/context/AuthContext';
import { Trash2 } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../../services/tasks';
import { listSprints } from '../../../services/sprints';
import { getServices } from '../../../services/services';
import { RichTextEditor } from '../../../components/common/RichTextEditor';

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  onDelete?: () => void;
  defaultSprintId?: number;
  defaultParentTaskId?: number;
};

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().optional(),
  type: z.enum(['bug', 'feature', 'todo', 'epic', 'improvement']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  sprintId: z.number().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  testerId: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  serviceId: z.number().optional().nullable(),
  testingSkipReason: z.string().optional().nullable(),
  parentTaskId: z.number().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskModal({ isOpen, onClose, task, onDelete, defaultSprintId, defaultParentTaskId }: TaskModalProps) {
  const isEditing = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { hasPermission, user } = useAuth(); // Destructured user

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch sprints
  const { data: sprintsData } = useQuery({
    queryKey: ['sprints', { status: ['planned', 'active'] }],
    queryFn: () => listSprints({ status: ['planned', 'active'], limit: 100 }),
    enabled: isOpen && hasPermission('sprints:view'),
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers(1, 1000),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('users:view'),
  });

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: () => getServices(1, 1000),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('services:view'),
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'todo',
      priority: 'medium',
      sprintId: defaultSprintId || null,
      assignedTo: null,
      testerId: null,
      estimatedHours: null,
      dueDate: null,
      serviceId: null,
      testingSkipReason: null,
      parentTaskId: defaultParentTaskId || null,
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (task && isEditing) {
      form.reset({
        title: task.title,
        description: task.description || '',
        type: task.type,
        priority: task.priority,
        sprintId: task.sprintId || null,
        assignedTo: task.assignedTo || null,
        testerId: task.testerId || null,
        estimatedHours: task.estimatedHours || null,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : null,
        serviceId: task.serviceId || null,
        testingSkipReason: task.testingSkipReason || null,
        parentTaskId: task.parentTaskId || null,
      });
    } else {
      // Default Assignee = Current User
      form.reset({
        title: '',
        description: '',
        type: 'todo',
        priority: 'medium',
        sprintId: defaultSprintId || null,
        assignedTo: (user?.id ? String(user.id) : null) as string | null, // Default to current user
        testerId: null,
        estimatedHours: null,
        dueDate: null,
        serviceId: null,
        testingSkipReason: null,
        parentTaskId: defaultParentTaskId || null,
      });
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, task, form, isEditing, defaultSprintId, defaultParentTaskId, user]);

  const onSubmit = async (values: TaskFormValues) => {
    setError(null);

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({
          id: task.id,
          data: {
            title: values.title,
            description: values.description,
            type: values.type,
            priority: values.priority,
            sprintId: values.sprintId,
            assignedTo: values.assignedTo,
            testerId: values.testerId,
            estimatedHours: values.estimatedHours,
            dueDate: values.dueDate,
            serviceId: values.serviceId,
            testingSkipReason: values.testingSkipReason,
          },
        });
      } else {
        await createTask.mutateAsync({
          title: values.title,
          description: values.description,
          type: values.type,
          priority: values.priority,
          sprintId: values.sprintId || undefined,
          assignedTo: values.assignedTo || undefined,
          testerId: values.testerId || undefined,
          estimatedHours: values.estimatedHours || undefined,
          dueDate: values.dueDate || undefined,
          serviceId: values.serviceId || undefined,
          testingSkipReason: values.testingSkipReason || undefined,
          parentTaskId: values.parentTaskId || undefined,
        });
      }

      if (!isEditing) {
        form.reset();
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} task`);
    }
  };

  const confirmDelete = async () => {
    if (!task) return;
    setError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      setDeleteConfirmOpen(false);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task');
    }
  };

  const isLoading = createTask.isPending || updateTask.isPending || deleteTask.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Task' : 'Create Task'} size="xl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Title *</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter task title"
              type="text"
              {...form.register('title')}
            />
          </label>
          {form.formState.errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <RichTextEditor
            label="Description"
            value={form.watch('description') || ''}
            onChange={(value) => form.setValue('description', value)}
            placeholder="Describe the task..."
            maxHeight="300px"
            submitShortcut="mod-enter"
            onSend={() => form.handleSubmit(onSubmit)()}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Type *</span>
              <select
                className="form-select flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                {...form.register('type')}
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="todo">To-Do</option>
                <option value="epic">Epic</option>
                <option value="improvement">Improvement</option>
              </select>
            </label>
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Priority *</span>
              <select
                className="form-select flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                {...form.register('priority')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
        </div>

        {hasPermission('sprints:view') && sprintsData?.data && (
          <div>
            <SearchableMultiSelect
              options={[
                { id: 0, name: 'No Sprint (Backlog)' },
                ...sprintsData.data.map((sprint: any) => ({
                  id: sprint.id,
                  name: sprint.name,
                }))
              ]}
              selectedIds={form.watch('sprintId') ? [form.watch('sprintId')!] : []}
              onChange={(selectedIds) => {
                const id = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
                form.setValue('sprintId', id === 0 ? null : id, { shouldDirty: true });
              }}
              label="Sprint"
              placeholder="Select sprint"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {hasPermission('users:view') && usersData?.data && (
            <>
              <div>
                <SearchableMultiSelect
                  options={usersData.data.map((u) => ({
                    id: u.id as unknown as number,
                    name: u.name || u.email,
                  }))}
                  selectedIds={form.watch('assignedTo') ? [form.watch('assignedTo') as unknown as number] : []}
                  onChange={(selectedIds) => {
                    const id = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
                    form.setValue('assignedTo', (id !== null ? String(id) : null) as string | null, { shouldDirty: true });
                  }}
                  label="Assigned To"
                  placeholder="Select user"
                  disabled={isLoading}
                />
              </div>

              {isEditing && (
                <div>
                  <SearchableMultiSelect
                    options={usersData.data.map((u) => ({
                      id: u.id as unknown as number,
                      name: u.name || u.email,
                    }))}
                    selectedIds={form.watch('testerId') ? [form.watch('testerId') as unknown as number] : []}
                    onChange={(selectedIds) => {
                      const id = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
                      form.setValue('testerId', (id !== null ? String(id) : null) as string | null, { shouldDirty: true });
                    }}
                    label="Tester (set during status updates)"
                    placeholder="Select tester"
                    disabled={isLoading}
                  />
                  {task?.testerAssignedAt && task?.tester && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>Tester since {new Date(task.testerAssignedAt).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Estimated Hours</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                placeholder="Optional"
                type="number"
                step="0.5"
                {...form.register('estimatedHours', {
                  setValueAs: (v) => (v === '' || v === null || v === undefined) ? null : parseFloat(v),
                  valueAsNumber: false
                })}
              />
            </label>
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Due Date</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                type="date"
                {...form.register('dueDate', {
                  setValueAs: (v) => v === '' || v === null || v === undefined ? null : v,
                  required: false
                })}
              />
            </label>
          </div>
        </div>

        {hasPermission('services:view') && servicesData?.data && servicesData.data.length > 0 && (
          <div>
            <SearchableMultiSelect
              options={servicesData.data.map((s: any) => ({
                id: s.id,
                name: s.name,
              }))}
              selectedIds={form.watch('serviceId') ? [form.watch('serviceId')!] : []}
              onChange={(selectedIds) => {
                const id = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
                form.setValue('serviceId', id, { shouldDirty: true });
              }}
              label="Service (Optional)"
              placeholder="Select service"
              disabled={isLoading}
            />
          </div>
        )}

        {isEditing && form.watch('testerId') === null && (
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                Testing Skip Reason (Required if no tester assigned)
              </span>
              <textarea
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
                placeholder="Explain why this task doesn't need testing..."
                rows={2}
                {...form.register('testingSkipReason')}
              />
            </label>
            {form.formState.errors.testingSkipReason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.testingSkipReason.message}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && hasPermission('tasks:delete') && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This will also delete all subtasks. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTask.isPending}
      />
    </Modal>
  );
}
