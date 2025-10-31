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
import { getCredentials } from '../../../services/credentials';
import { getDomains, getDomainsByItem } from '../../../services/domains';

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

  // Fetch credentials for dropdown
  const { data: credentials } = useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: () => getCredentials(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
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

  // Fetch domains for multi-select
  const { data: domainsData } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => getDomains({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('domains:view'),
  });

  // Fetch existing domains for this server (if editing)
  const { data: existingDomainsData } = useQuery({
    queryKey: ['domains', 'server', server?.id],
    queryFn: async () => {
      if (!server?.id) return [];
      return getDomainsByItem('server', server.id);
    },
    enabled: isOpen && isEditing && !!server?.id && hasPermission('domains:view'),
  });

  // Create schema dynamically based on constants from backend
  const serverSchema = useMemo(() => {
    const serverTypes = constants?.serverTypes || ['os'];
    return z.object({
      name: z.string().min(1, 'Server name is required').max(100, 'Server name must be 100 characters or less'),
      type: z.enum(serverTypes as [string, ...string[]]).default(serverTypes[0] as string),
      publicIp: z.string().ip('Invalid IP address').optional().or(z.literal('')),
      privateIp: z.string().ip('Invalid IP address').optional().or(z.literal('')),
      endpoint: z.string().optional().or(z.literal('')),
      port: z.coerce.number().int().min(1).max(65535).optional(),
      sshPort: z.coerce.number().int().min(1).max(65535).optional(),
      username: z.string().max(100).optional().or(z.literal('')),
      password: z.string().optional(),
      credentialIds: z.array(z.number()).optional(),
      domainIds: z.array(z.number()).optional(),
      groupIds: z.array(z.number()).optional(),
    }).refine((data) => {
      // OS and EC2: require IP fields and SSH port
      if (data.type === 'os' || data.type === 'ec2') {
        if (!data.publicIp || data.publicIp.trim().length === 0) {
          return false;
        }
        if (!data.privateIp || data.privateIp.trim().length === 0) {
          return false;
        }
        if (!data.sshPort || data.sshPort < 1 || data.sshPort > 65535) {
          return false;
        }
      }
      // RDS: require endpoint and port
      else if (data.type === 'rds') {
        if (!data.endpoint || data.endpoint.trim().length === 0) {
          return false;
        }
        if (!data.port || data.port < 1 || data.port > 65535) {
          return false;
        }
      }
      return true;
    }, {
      message: 'Required fields missing for server type',
      path: ['type'],
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
      endpoint: server?.endpoint || '',
      port: server?.port || undefined,
      sshPort: server?.sshPort || 22,
      username: server?.username || '',
      password: '',
      credentialIds: server?.credentials?.map((sc) => sc.credential.id) || [],
      domainIds: [],
      groupIds: [],
    },
  });

  // Reset form when modal opens/closes or server changes
  useEffect(() => {
    if (!isOpen) return;
    
    const defaultType = (constants?.serverTypes[0] as string) || 'os';
    if (server) {
      form.reset({
        name: server.name,
        type: server.type || defaultType,
        publicIp: server.publicIp || '',
        privateIp: server.privateIp || '',
        endpoint: server.endpoint || '',
        port: server.port || undefined,
        sshPort: server.sshPort || 22,
        username: server.username || '',
        password: '', // Password is not sent in response, will be revealed via API
        credentialIds: server.credentials?.map((sc) => sc.credential.id) || [],
        domainIds: existingDomainsData || [],
        groupIds: existingGroupsData || [],
      });
    } else {
      form.reset({
        name: '',
        type: defaultType,
        publicIp: '',
        privateIp: '',
        endpoint: '',
        port: undefined,
        sshPort: 22,
        username: '',
        password: '',
        credentialIds: [],
        domainIds: [],
        groupIds: [],
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [isOpen, server, form, constants, existingGroupsData, existingDomainsData]);

  // Watch server type for conditional fields (after form is initialized)
  const watchedType = form.watch('type');
  const isOsOrEc2 = watchedType === 'os' || watchedType === 'ec2';
  const isRds = watchedType === 'rds';
  const isCloudService = ['amplify', 'lambda', 'ecs', 'other'].includes(watchedType);

  const onSubmit = async (values: ServerFormValues) => {
    setError(null);
    try {
      let createdOrUpdatedServer: Server;
      
      const submitData: any = {
        name: values.name,
        type: values.type,
        credentialIds: values.credentialIds || [],
        domainIds: values.domainIds || [],
      };
      
      // OS and EC2: IP fields + SSH port + optional username/password
      if (values.type === 'os' || values.type === 'ec2') {
        submitData.publicIp = values.publicIp || null;
        submitData.privateIp = values.privateIp || null;
        submitData.sshPort = values.sshPort ? Number(values.sshPort) : null;
        submitData.username = values.username || null;
      } 
      // RDS: endpoint + port + optional username/password
      else if (values.type === 'rds') {
        submitData.endpoint = values.endpoint || null;
        submitData.port = values.port ? Number(values.port) : null;
        submitData.username = values.username || null;
      } 
      // Amplify, Lambda, ECS, Other: Only endpoint + optional username/password
      else {
        submitData.endpoint = values.endpoint || null;
        submitData.username = values.username || null;
      }
      
      // Password is optional for all types
      if (values.password && values.password.trim()) {
        submitData.password = values.password;
      }
      
      if (isEditing && server) {
        createdOrUpdatedServer = await updateServer.mutateAsync({ id: server.id, data: submitData });
      } else {
        createdOrUpdatedServer = await createServer.mutateAsync(submitData);
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

      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        const defaultType = (constants?.serverTypes[0] as string) || 'os';
              form.reset({
                name: '',
                type: defaultType,
                publicIp: '',
                privateIp: '',
                endpoint: '',
                port: undefined,
                sshPort: 22,
                username: '',
                password: '',
                credentialIds: [],
                domainIds: [],
                groupIds: [],
              });
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

        {/* IP fields for OS and EC2 */}
        {isOsOrEc2 && (
          <>
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
          </>
        )}

        {/* Endpoint + Port for RDS */}
        {isRds && (
          <>
            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Endpoint</span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., db-instance.region.rds.amazonaws.com"
                  type="text"
                  autoComplete="off"
                  {...form.register('endpoint')}
                />
              </label>
              {form.formState.errors.endpoint && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.endpoint.message}</p>
              )}
            </div>

            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Port</span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., 5432, 3306"
                  type="number"
                  autoComplete="off"
                  {...form.register('port')}
                />
              </label>
              {form.formState.errors.port && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.port.message}</p>
              )}
            </div>
          </>
        )}

        {/* Endpoint for Amplify/Lambda/ECS/Other */}
        {isCloudService && (
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Endpoint (Optional)</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., https://api.example.com"
                type="text"
                autoComplete="off"
                {...form.register('endpoint')}
              />
            </label>
            {form.formState.errors.endpoint && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.endpoint.message}</p>
            )}
          </div>
        )}

        {/* Username and Password (optional for all types) */}
        {(isOsOrEc2 || isRds || isCloudService) && (
          <>
            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                  Username {isOsOrEc2 ? '' : '(Optional)'}
                </span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder={isOsOrEc2 ? 'Enter SSH username' : 'Optional username'}
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
                placeholder={isEditing ? 'Leave empty to keep current password' : 'Password (optional)'}
                label={`Password (Optional) ${isEditing ? '(leave empty to keep current password)' : ''}`}
                revealEndpoint={isEditing && server ? `/servers/${server.id}/reveal-password` : undefined}
                error={form.formState.errors.password?.message}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        {/* Credential selector (optional for all types) - Multi-select */}
        <div>
          <SearchableMultiSelect
            options={(credentials || []).map((cred) => ({ id: cred.id, name: `${cred.name} (${cred.type})` }))}
            selectedIds={form.watch('credentialIds') || []}
            onChange={(selectedIds) => form.setValue('credentialIds', selectedIds as number[])}
            placeholder="Search and select credentials..."
            label="Credentials (Optional)"
            disabled={isLoading}
          />
          {form.formState.errors.credentialIds && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.credentialIds?.message}</p>
          )}
        </div>

        {/* Domains selector (optional) - Multi-select */}
        {hasPermission('domains:view') && domainsData?.data && domainsData.data.length > 0 && (
          <div>
            <SearchableMultiSelect
              options={domainsData.data.map((d) => ({ id: d.id, name: d.name }))}
              selectedIds={form.watch('domainIds') || []}
              onChange={(selectedIds) => form.setValue('domainIds', selectedIds)}
              placeholder="Search and select domains..."
              label="Domains (Optional)"
              disabled={isLoading}
            />
            {form.formState.errors.domainIds && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.domainIds?.message}</p>
            )}
          </div>
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

