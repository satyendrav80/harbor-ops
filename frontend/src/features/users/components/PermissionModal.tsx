import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreatePermission, useUpdatePermission, useDeletePermission } from '../hooks/usePermissionMutations';
import { Trash2 } from 'lucide-react';
import type { Permission } from '../../../services/users';

const permissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required').max(100, 'Permission name must be less than 100 characters'),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

type PermissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  permission?: Permission | null;
  onDelete?: () => void;
};

export function PermissionModal({ isOpen, onClose, permission, onDelete }: PermissionModalProps) {
  const isEditing = !!permission;
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: permission?.name || '',
    },
  });

  // Reset form when permission changes
  useEffect(() => {
    if (permission) {
      form.reset({ name: permission.name });
    } else {
      form.reset({ name: '' });
    }
  }, [permission, form]);

  const onSubmit = async (values: PermissionFormValues) => {
    setError(null);
    try {
      if (isEditing) {
        await updatePermission.mutateAsync({ id: permission!.id, name: values.name });
      } else {
        await createPermission.mutateAsync(values.name);
      }
      form.reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save permission');
    }
  };

  const handleDelete = async () => {
    if (!permission) return;
    setError(null);
    try {
      await deletePermission.mutateAsync(permission.id);
      setShowDeleteConfirm(false);
      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete permission');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Permission' : 'Create Permission'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Permission Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Permission Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...form.register('name')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g., view_cred, edit_server"
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              Are you sure you want to delete this permission? This will remove it from all roles. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePermission.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletePermission.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPermission.isPending || updatePermission.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPermission.isPending || updatePermission.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

