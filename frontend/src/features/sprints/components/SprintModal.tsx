import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateSprint, useUpdateSprint, useDeleteSprint } from '../hooks/useSprintMutations';
import { useAuth } from '../../auth/context/AuthContext';
import { Trash2 } from 'lucide-react';
import type { Sprint, SprintStatus } from '../../../services/sprints';
import { useModalError } from '../../../hooks/useModalError';

type SprintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sprint?: Sprint | null;
  onDelete?: () => void;
  onStatusChangeRedirect?: (sprint: Sprint, newStatus: 'completed' | 'cancelled') => void;
};

const sprintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type SprintFormValues = z.infer<typeof sprintSchema>;

export function SprintModal({ isOpen, onClose, sprint, onDelete, onStatusChangeRedirect }: SprintModalProps) {
  const isEditing = !!sprint;
  const { error, showError, clearError, ErrorBanner } = useModalError();
  const createSprint = useCreateSprint({
    mode: 'inline',
    suppressSuccessToast: true,
    onErrorMessage: (msg) => showError(msg, 'Failed to create sprint'),
  });
  const updateSprint = useUpdateSprint({
    mode: 'inline',
    suppressSuccessToast: true,
    onErrorMessage: (msg) => showError(msg, 'Failed to update sprint'),
  });
  const deleteSprint = useDeleteSprint({
    mode: 'inline',
    suppressSuccessToast: true,
    onErrorMessage: (msg) => showError(msg, 'Failed to delete sprint'),
  });
  const { hasPermission } = useAuth();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const form = useForm<SprintFormValues>({
    resolver: zodResolver(sprintSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'planned',
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (sprint && isEditing) {
      form.reset({
        name: sprint.name,
        description: sprint.description || '',
        startDate: sprint.startDate.split('T')[0],
        endDate: sprint.endDate.split('T')[0],
        status: sprint.status,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      form.reset({
        name: '',
        description: '',
        startDate: today,
        endDate: twoWeeksLater,
        status: 'planned',
      });
    }
    clearError();
    setDeleteConfirmOpen(false);
  }, [isOpen, sprint, form, isEditing, clearError]);

  const onSubmit = async (values: SprintFormValues) => {
    try {
      if (isEditing && sprint) {
        // Intercept status changes to 'completed' or 'cancelled'
        if (values.status && (values.status === 'completed' || values.status === 'cancelled') && values.status !== sprint.status) {
          if (onStatusChangeRedirect) {
            onStatusChangeRedirect(sprint, values.status);
            onClose();
            return;
          }
        }

        await updateSprint.mutateAsync({
          id: sprint.id,
          data: {
            name: values.name,
            description: values.description,
            startDate: values.startDate,
            endDate: values.endDate,
            status: values.status,
          },
        });
      } else {
        await createSprint.mutateAsync({
          name: values.name,
          description: values.description,
          startDate: values.startDate,
          endDate: values.endDate,
        });
      }

      if (!isEditing) {
        form.reset();
      }
      onClose();
    } catch (err: any) {
      showError(err, `Failed to ${isEditing ? 'update' : 'create'} sprint`);
    }
  };

  const confirmDelete = async () => {
    if (!sprint) return;
    clearError();
    try {
      await deleteSprint.mutateAsync(sprint.id);
      setDeleteConfirmOpen(false);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      showError(err, 'Failed to delete sprint');
    }
  };

  const isLoading = createSprint.isPending || updateSprint.isPending || deleteSprint.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Sprint' : 'Create Sprint'} size="lg">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {ErrorBanner}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Sprint Name *</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Sprint 1, Q1 2024"
              type="text"
              {...form.register('name')}
            />
          </label>
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Description</span>
            <textarea
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
              placeholder="Sprint goals and objectives..."
              rows={3}
              {...form.register('description')}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Start Date *</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                type="date"
                {...form.register('startDate')}
              />
            </label>
            {form.formState.errors.startDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">End Date *</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                type="date"
                {...form.register('endDate')}
              />
            </label>
            {form.formState.errors.endDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Status</span>
              <select
                className="form-select flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                {...form.register('status')}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && hasPermission('sprints:delete') && (
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
        title="Delete Sprint"
        message="Are you sure you want to delete this sprint? All tasks will be moved to the backlog. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteSprint.isPending}
      />
    </Modal>
  );
}
