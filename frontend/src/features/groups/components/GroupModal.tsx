import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateGroup, useUpdateGroup, useDeleteGroup } from '../hooks/useGroupMutations';
import { Trash2 } from 'lucide-react';
import type { Group } from '../../../services/groups';

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be 100 characters or less'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

type GroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null;
  onDelete?: () => void;
};

export function GroupModal({ isOpen, onClose, group, onDelete }: GroupModalProps) {
  const isEditing = !!group;
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name || '',
    },
  });

  // Reset form when modal opens/closes or group changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (group) {
      form.reset({
        name: group.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, group, form]);

  const onSubmit = async (values: GroupFormValues) => {
    setError(null);
    try {
      if (isEditing && group) {
        await updateGroup.mutateAsync({ id: group.id, name: values.name });
      } else {
        await createGroup.mutateAsync({ name: values.name });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({ name: '' });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save group');
    }
  };

  const confirmDelete = async () => {
    if (!group) return;
    setError(null);
    try {
      await deleteGroup.mutateAsync(group.id);
      setDeleteConfirmOpen(false);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete group');
    }
  };

  const isLoading = createGroup.isPending || updateGroup.isPending || deleteGroup.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Group' : 'Create Group'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Group Name</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter group name"
              type="text"
              autoComplete="off"
              {...form.register('name')}
            />
          </label>
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && (
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
              {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteGroup.isPending}
      />
    </Modal>
  );
}

