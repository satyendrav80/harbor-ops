import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreatePermission, useUpdatePermission, useDeletePermission } from '../hooks/usePermissionMutations';
import { getPermissionConfig } from '../../../services/users';
import { Trash2 } from 'lucide-react';
import type { Permission } from '../../../services/users';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';

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
  const [resourceActions, setResourceActions] = useState<Record<string, string[]>>({});
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

  const selectedResource = form.watch('resource');

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getPermissionConfig();
        setResources(toOptions(cfg.resources));
        // Store resource-specific actions map if available
        if (cfg.resourceActions) {
          setResourceActions(cfg.resourceActions);
          // Set initial actions based on selected resource or all actions
          const initialResource = permission?.resource || selectedResource;
          const initialActions = initialResource && cfg.resourceActions[initialResource]
            ? cfg.resourceActions[initialResource]
            : cfg.actions;
          setActions(toOptions(initialActions));
        } else {
          // Fallback to all actions for backwards compatibility
          setActions(toOptions(cfg.actions));
        }
      } catch {}
    })();
  }, [permission?.resource, selectedResource]);

  // Update actions when resource selection changes
  useEffect(() => {
    if (selectedResource && resourceActions[selectedResource]) {
      const resourceSpecificActions = resourceActions[selectedResource];
      setActions(toOptions(resourceSpecificActions));
      // Clear action selection if it's not valid for the new resource
      const currentAction = form.getValues('action');
      if (currentAction && !resourceSpecificActions.includes(currentAction)) {
        form.setValue('action', '');
      }
    } else if (Object.keys(resourceActions).length === 0) {
      // Fallback: if no resourceActions map, use all actions
      // This handles backwards compatibility
    }
  }, [selectedResource, resourceActions, form]);

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  // Reset form when modal opens/closes or permission changes
  useEffect(() => {
    if (!isOpen) return;
    
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
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, permission, form]);

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

  const confirmDelete = async () => {
    if (!permission) return;
    setError(null);
    try {
      await deletePermission.mutateAsync(permission.id);
      setDeleteConfirmOpen(false);
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && !isSystem && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
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
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Permission"
        message="Are you sure you want to delete this permission? This will remove it from all roles. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletePermission.isPending}
      />
    </Modal>
  );
}

