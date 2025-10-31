import { useEffect, useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/common/Modal';
import { MaskedPasswordInput } from '../../../components/common/MaskedPasswordInput';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { useCreateServer, useUpdateServer, useDeleteServer } from '../hooks/useServerMutations';
import { Trash2 } from 'lucide-react';
import type { Server } from '../../../services/servers';
import { useConstants } from '../../constants/hooks/useConstants';
import { getGroups, getGroupsByItem } from '../../../services/groups';
import { useAddItemToGroup, useRemoveItemFromGroup } from '../../groups/hooks/useGroupMutations';
import { useAuth } from '../../auth/context/AuthContext';

type ServerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  server?: Server | null;
  onDelete?: () => void;
};

export function ServerModal({ isOpen, onClose, server, onDelete }: ServerModalProps) {
  const isEditing = !!server;
  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const { data: constants } = useConstants();

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { hasPermission } = useAuth();
  const addItemToGroup = useAddItemToGroup();
  const removeItemFromGroup = useRemoveItemFromGroup();

  // Fetch groups for multi-select
  const { data: groupsData } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => getGroups({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('groups:view'),
  });

  // Fetch existing groups for this server (if editing)
  const { data: existingGroupsData } = useQuery({
    queryKey: ['groups', 'server', server?.id],
    queryFn: async () => {
      if (!server?.id) return [];
      return getGroupsByItem('server', server.id);
    },
    enabled: isOpen && isEditing && !!server?.id && hasPermission('groups:view'),
  });

  // Create schema dynamically based on constants from backend
  // Make all fields optional or have conditional validation
  const serverSchema = useMemo(() => {
    const serverTypes = constants?.serverTypes || ['os'];
    return z.object({
      name: z.string().min(1, 'Server name is required').max(100, 'Server name must be 100 characters or less'),
      type: z.enum(serverTypes as [string, ...string[]]).default(serverTypes[0] as string),
      publicIp: z.string().min(1, 'Public IP is required').ip('Invalid IP address'),
      privateIp: z.string().min(1, 'Private IP is required').ip('Invalid IP address'),
      sshPort: z.coerce.number().int().min(1).max(65535).optional(),
      username: z.string().max(100).optional(),
      password: z.string().optional(),
      groupIds: z.array(z.number()).optional(),
    }).refine((data) => {
      // For OS servers, require SSH-related fields
      if (data.type === 'os') {
        if (!data.sshPort || data.sshPort < 1 || data.sshPort > 65535) {
          return false;
        }
        if (!data.username || data.username.trim().length === 0) {
          return false;
        }
      }
      return true;
    }, {
      message: 'SSH port and username are required for OS servers',
      path: ['sshPort'], // This will show error on sshPort field
    });
  }, [constants]);

  type ServerFormValues = z.infer<typeof serverSchema>;

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: server?.name || '',
      type: server?.type || (constants?.serverTypes[0] as string) || 'os',
      publicIp: server?.publicIp || '',
      privateIp: server?.privateIp || '',
      sshPort: server?.sshPort || 22,
      username: server?.username || '',
      password: '',
      groupIds: [],
    },
  });

  // Reset form when server changes
  useEffect(() => {
    const defaultType = (constants?.serverTypes[0] as string) || 'os';
    if (server) {
      form.reset({
        name: server.name,
        type: server.type || defaultType,
        publicIp: server.publicIp,
        privateIp: server.privateIp,
        sshPort: server.sshPort || 22,
        username: server.username || '',
        password: '', // Password is not sent in response, will be revealed via API
        groupIds: existingGroupsData || [],
      });
    } else {
      form.reset({
        name: '',
        type: defaultType,
        publicIp: '',
        privateIp: '',
        sshPort: 22,
        username: '',
        password: '',
        groupIds: [],
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [server, form, constants, existingGroupsData]);

  // Watch server type for conditional fields (after form is initialized)
  const watchedType = form.watch('type');
  const isOsServer = watchedType === 'os';

  const onSubmit = async (values: ServerFormValues) => {
    setError(null);
    try {
      let createdOrUpdatedServer: Server;
      
      if (isEditing && server) {
        // Only include password if it's provided and not masked
        const updateData: any = {
          name: values.name,
          type: values.type,
          publicIp: values.publicIp,
          privateIp: values.privateIp,
        };
        
        // Only include SSH-related fields for OS servers or if provided
        if (values.type === 'os') {
          updateData.sshPort = values.sshPort;
          updateData.username = values.username;
        } else if (values.sshPort !== undefined) {
          updateData.sshPort = values.sshPort;
        }
        if (values.username !== undefined && values.username !== '') {
          updateData.username = values.username;
        }
        
        // Only send password if it's provided and not empty
        if (values.password && values.password.trim()) {
          updateData.password = values.password;
        }
        
        createdOrUpdatedServer = await updateServer.mutateAsync({ id: server.id, data: updateData });
      } else {
        const createData: any = {
          name: values.name,
          type: values.type,
          publicIp: values.publicIp,
          privateIp: values.privateIp,
        };
        
        // Only include SSH-related fields for OS servers
        if (values.type === 'os') {
          createData.sshPort = values.sshPort;
          createData.username = values.username;
        } else if (values.sshPort !== undefined) {
          createData.sshPort = values.sshPort;
        }
        if (values.username !== undefined && values.username !== '') {
          createData.username = values.username;
        }
        if (values.password && values.password.trim()) {
          createData.password = values.password;
        }
        
        createdOrUpdatedServer = await createServer.mutateAsync(createData);
      }

      // Update groups membership
      if (hasPermission('groups:update')) {
        const existingGroupIds = existingGroupsData || [];
        const newGroupIds = values.groupIds || [];
        
        // Groups to add (in new list but not in existing)
        const groupsToAdd = newGroupIds.filter((id) => !existingGroupIds.includes(id));
        
        // Groups to remove (in existing but not in new list)
        const groupsToRemove = existingGroupIds.filter((id) => !newGroupIds.includes(id));
        
        // Add to new groups
        await Promise.all(
          groupsToAdd.map((groupId) =>
            addItemToGroup.mutateAsync({
              groupId,
              itemType: 'server',
              itemId: createdOrUpdatedServer.id,
            })
          )
        );
        
        // Remove from groups
        await Promise.all(
          groupsToRemove.map((groupId) =>
            removeItemFromGroup.mutateAsync({ groupId, itemId: createdOrUpdatedServer.id })
          )
        );
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} server`);
    }
  };

  const handleDelete = async () => {
    if (!server) return;
    setError(null);
    try {
      await deleteServer.mutateAsync(server.id);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete server');
    }
  };

  const isLoading = createServer.isPending || updateServer.isPending || deleteServer.isPending || addItemToGroup.isPending || removeItemFromGroup.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Server' : 'Create Server'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Server Name</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter server name"
              type="text"
              autoComplete="off"
              {...form.register('name')}
            />
          </label>
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Server Type</span>
            <select
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              {...form.register('type')}
            >
              {constants?.serverTypes.map((type) => (
                <option key={type} value={type}>
                  {constants?.serverTypeLabels[type] || type}
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.type.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Public IP</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., 192.168.1.100"
              type="text"
              autoComplete="off"
              {...form.register('publicIp')}
            />
          </label>
          {form.formState.errors.publicIp && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.publicIp.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Private IP</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., 10.0.0.100"
              type="text"
              autoComplete="off"
              {...form.register('privateIp')}
            />
          </label>
          {form.formState.errors.privateIp && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.privateIp.message}</p>
          )}
        </div>

                {isOsServer && (
                  <>
                    <div>
                      <label className="flex flex-col">
                        <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">SSH Port</span>
                        <input
                          className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                          placeholder="22"
                          type="number"
                          autoComplete="off"
                          {...form.register('sshPort')}
                        />
                      </label>
                      {form.formState.errors.sshPort && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.sshPort.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="flex flex-col">
                        <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Username</span>
                        <input
                          className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                          placeholder="Enter SSH username"
                          type="text"
                          autoComplete="off"
                          {...form.register('username')}
                        />
                      </label>
                      {form.formState.errors.username && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.username.message}</p>
                      )}
                    </div>

                    <div>
                      <MaskedPasswordInput
                        value={form.watch('password') || ''}
                        onChange={(value) => form.setValue('password', value, { shouldValidate: true })}
                        placeholder={isEditing ? 'Leave empty to keep current password' : 'Enter SSH password'}
                        label={`Password ${isEditing ? '(leave empty to keep current password)' : ''}`}
                        revealEndpoint={isEditing && server ? `/servers/${server.id}/reveal-password` : undefined}
                        error={form.formState.errors.password?.message}
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}

                {/* Optional SSH fields for non-OS servers */}
                {!isOsServer && (
                  <>
                    <div>
                      <label className="flex flex-col">
                        <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Port (Optional)</span>
                        <input
                          className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                          placeholder="Optional port"
                          type="number"
                          autoComplete="off"
                          {...form.register('sshPort')}
                        />
                      </label>
                      {form.formState.errors.sshPort && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.sshPort.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="flex flex-col">
                        <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Username (Optional)</span>
                        <input
                          className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                          placeholder="Optional username"
                          type="text"
                          autoComplete="off"
                          {...form.register('username')}
                        />
                      </label>
                      {form.formState.errors.username && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.username.message}</p>
                      )}
                    </div>

                    <div>
                      <MaskedPasswordInput
                        value={form.watch('password') || ''}
                        onChange={(value) => form.setValue('password', value, { shouldValidate: true })}
                        placeholder={isEditing ? 'Leave empty to keep current password' : 'Optional password'}
                        label={`Password (Optional) ${isEditing ? '(leave empty to keep current password)' : ''}`}
                        revealEndpoint={isEditing && server ? `/servers/${server.id}/reveal-password` : undefined}
                        error={form.formState.errors.password?.message}
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}

                {hasPermission('groups:update') && groupsData?.data && groupsData.data.length > 0 && (
                  <div>
                    <SearchableMultiSelect
                      options={groupsData.data.map((g) => ({ id: g.id, name: g.name }))}
                      selectedIds={form.watch('groupIds') || []}
                      onChange={(selectedIds) => form.setValue('groupIds', selectedIds)}
                      placeholder="Search and select groups..."
                      label="Groups"
                      disabled={isLoading}
                    />
                    {form.formState.errors.groupIds && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.groupIds?.message}</p>
                    )}
                  </div>
                )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
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

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Confirm Deletion</p>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Are you sure you want to delete this server? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

