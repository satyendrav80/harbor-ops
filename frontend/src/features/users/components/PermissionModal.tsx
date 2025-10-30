import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreatePermission, useUpdatePermission, useDeletePermission } from '../hooks/usePermissionMutations';
import { getPermissionConfig } from '../../../services/users';
import { Trash2 } from 'lucide-react';
import type { Permission } from '../../../services/users';

function toOptions(values: string[]) {
  return values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ') }));
}

const permissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required').max(100, 'Permission name must be less than 100 characters'),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
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
  const isSystem = !!permission?.system;
  const [resources, setResources] = useState<Array<{ value: string; label: string }>>([]);
  const [actions, setActions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getPermissionConfig();
        setResources(toOptions(cfg.resources));
        setActions(toOptions(cfg.actions));
      } catch {}
    })();
  }, []);
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: permission?.name || '',
      resource: permission?.resource || '',
      action: permission?.action || '',
      description: permission?.description || '',
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto-generate permission name from resource:action
  useEffect(() => {
    const subscription = form.watch((value, { name: changedField }) => {
      if (changedField === 'resource' || changedField === 'action') {
        const resource = value.resource || '';
        const action = value.action || '';
        const currentName = value.name || '';
        
        // Only auto-generate if name is empty or matches the pattern
        if (resource && action && (!currentName || currentName === `${resource}:${action}` || currentName.match(/^[^:]+:[^:]+$/))) {
          form.setValue('name', `${resource}:${action}`, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset form when permission changes
  useEffect(() => {
    if (permission) {
      form.reset({ 
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description || '',
      });
    } else {
      form.reset({ 
        name: '', 
        resource: '', 
        action: '', 
        description: '' 
      });
    }
  }, [permission, form]);

  const onSubmit = async (values: PermissionFormValues) => {
    setError(null);
    try {
      if (isEditing) {
        await updatePermission.mutateAsync({ 
          id: permission!.id, 
          name: values.name,
          resource: values.resource,
          action: values.action,
          description: values.description,
        });
      } else {
        await createPermission.mutateAsync({
          name: values.name,
          resource: values.resource,
          action: values.action,
          description: values.description,
        });
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
        {/* Resource */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource <span className="text-red-500">*</span>
          </label>
          <select
            disabled={isSystem}
            {...form.register('resource')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a resource</option>
            {resources.map((resource) => (
              <option key={resource.value} value={resource.value}>
                {resource.label}
              </option>
            ))}
          </select>
          {form.formState.errors.resource && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.resource.message}</p>
          )}
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Action <span className="text-red-500">*</span>
          </label>
          <select
            disabled={isSystem}
            {...form.register('action')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select an action</option>
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
          {form.formState.errors.action && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.action.message}</p>
          )}
        </div>

        {/* Permission Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Permission Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={isSystem}
            {...form.register('name')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g., users:view, credentials:create"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This will be auto-generated as "{form.watch('resource') || 'resource'}:{form.watch('action') || 'action'}" if left empty
          </p>
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            disabled={isSystem}
            {...form.register('description')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Optional description of what this permission allows"
          />
          {form.formState.errors.description && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.description.message}</p>
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
            {isEditing && !showDeleteConfirm && !isSystem && (
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
              disabled={isSystem || createPermission.isPending || updatePermission.isPending}
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

