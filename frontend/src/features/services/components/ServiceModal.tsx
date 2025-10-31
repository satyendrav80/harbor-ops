import { useEffect, useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreateService, useUpdateService, useDeleteService } from '../hooks/useServiceMutations';
import { Trash2 } from 'lucide-react';
import type { Service } from '../../../services/services';
import { useQuery } from '@tanstack/react-query';
import { getServers } from '../../../services/servers';
import { getCredentials } from '../../../services/credentials';
import { getGroups, getGroupsByItem } from '../../../services/groups';
import { getDomains, getDomainsByItem } from '../../../services/domains';
import { useAddItemToGroup, useRemoveItemFromGroup } from '../../groups/hooks/useGroupMutations';
import { useAuth } from '../../auth/context/AuthContext';
import { useConstants } from '../../constants/hooks/useConstants';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Service name must be 100 characters or less'),
  port: z.coerce.number().int().min(1, 'Port must be between 1 and 65535').max(65535),
  serverId: z.coerce.number().int().min(1, 'Server is required'),
  credentialIds: z.array(z.number()).optional(),
  domainIds: z.array(z.number()).optional(),
  sourceRepo: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  }),
  appId: z.string().optional().nullable(),
  functionName: z.string().optional().nullable(),
  deploymentUrl: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  }),
  groupIds: z.array(z.number()).optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

type ServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
  onDelete?: () => void;
};

export function ServiceModal({ isOpen, onClose, service, onDelete }: ServiceModalProps) {
  const isEditing = !!service;
  const { hasPermission } = useAuth();
  const { data: constants } = useConstants();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const addItemToGroup = useAddItemToGroup();
  const removeItemFromGroup = useRemoveItemFromGroup();

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch servers and credentials for dropdowns
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'all'],
    queryFn: () => getServers(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: credentials } = useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: () => getCredentials(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  // Fetch groups for multi-select
  const { data: groupsData } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => getGroups({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('groups:view'),
  });

  // Fetch existing groups for this service (if editing)
  const { data: existingGroupsData } = useQuery({
    queryKey: ['groups', 'service', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      return getGroupsByItem('service', service.id);
    },
    enabled: isOpen && isEditing && !!service?.id && hasPermission('groups:view'),
  });

  // Fetch domains for multi-select
  const { data: domainsData } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => getDomains({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('domains:view'),
  });

  // Fetch existing domains for this service (if editing)
  const { data: existingDomainsData } = useQuery({
    queryKey: ['domains', 'service', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      return getDomainsByItem('service', service.id);
    },
    enabled: isOpen && isEditing && !!service?.id && hasPermission('domains:view'),
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || '',
      port: service?.port || 80,
      serverId: service?.serverId || 0,
      credentialIds: [],
      domainIds: [],
      sourceRepo: service?.sourceRepo || '',
      appId: service?.appId || '',
      functionName: service?.functionName || '',
      deploymentUrl: service?.deploymentUrl || '',
      groupIds: [],
    },
  });

  // Get selected server to show type-specific fields
  const selectedServerId = form.watch('serverId');
  const selectedServer = useMemo(() => {
    return serversData?.data.find((s) => s.id === selectedServerId);
  }, [selectedServerId, serversData]);

  const serverType = selectedServer?.type;
  const showAmplifyLambdaFields = serverType === 'amplify' || serverType === 'lambda';

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        port: service.port,
        serverId: service.serverId,
        credentialIds: service.credentials?.map((sc) => sc.credential.id) || [],
        domainIds: existingDomainsData || [],
        sourceRepo: service.sourceRepo || '',
        appId: service.appId || '',
        functionName: service.functionName || '',
        deploymentUrl: service.deploymentUrl || '',
        groupIds: existingGroupsData || [],
      });
    } else {
      form.reset({
        name: '',
        port: 80,
        serverId: 0,
        credentialIds: [],
        domainIds: [],
        sourceRepo: '',
        appId: '',
        functionName: '',
        deploymentUrl: '',
        groupIds: [],
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [isOpen, service, form, existingGroupsData, existingDomainsData]);

  const onSubmit = async (values: ServiceFormValues) => {
    setError(null);
    try {
      let createdOrUpdatedService: Service;
      
      if (isEditing && service) {
        createdOrUpdatedService = await updateService.mutateAsync({
          id: service.id,
          data: {
            name: values.name,
            port: values.port,
            serverId: values.serverId,
            credentialIds: values.credentialIds || [],
            domainIds: values.domainIds || [],
            sourceRepo: values.sourceRepo || null,
            appId: values.appId || null,
            functionName: values.functionName || null,
            deploymentUrl: values.deploymentUrl || null,
          },
        });
      } else {
        createdOrUpdatedService = await createService.mutateAsync({
          name: values.name,
          port: values.port,
          serverId: values.serverId,
          credentialIds: values.credentialIds || [],
          domainIds: values.domainIds || [],
          sourceRepo: values.sourceRepo || null,
          appId: values.appId || null,
          functionName: values.functionName || null,
          deploymentUrl: values.deploymentUrl || null,
        });
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
              itemType: 'service',
              itemId: createdOrUpdatedService.id,
            })
          )
        );
        
        // Remove from groups
        await Promise.all(
          groupsToRemove.map((groupId) =>
            removeItemFromGroup.mutateAsync({ groupId, itemId: createdOrUpdatedService.id })
          )
        );
      }

      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          name: '',
          port: 80,
          serverId: 0,
          credentialId: null,
          sourceRepo: '',
          appId: '',
          functionName: '',
          deploymentUrl: '',
          groupIds: [],
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} service`);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    setError(null);
    try {
      await deleteService.mutateAsync(service.id);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete service');
    }
  };

  const isLoading = createService.isPending || updateService.isPending || deleteService.isPending || addItemToGroup.isPending || removeItemFromGroup.isPending;
  const servers = serversData?.data || [];
  const credentialsList = Array.isArray(credentials) ? credentials : [];
  const groups = groupsData?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Service' : 'Create Service'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[90vh] overflow-y-auto">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Service Name</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter service name"
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
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Port</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., 80, 443, 3000"
              type="number"
              autoComplete="off"
              {...form.register('port')}
            />
          </label>
          {form.formState.errors.port && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.port.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Server</span>
            <select
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              {...form.register('serverId')}
            >
              <option value={0}>Select a server</option>
              {servers.map((server) => {
                const serverTypeLabel = constants?.serverTypeLabels[server.type] || server.type;
                return (
                  <option key={server.id} value={server.id}>
                    {server.name} ({serverTypeLabel}) - {server.publicIp}
                  </option>
                );
              })}
            </select>
          </label>
          {form.formState.errors.serverId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.serverId.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Source/Repo Link</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="https://github.com/user/repo"
              type="url"
              autoComplete="off"
              {...form.register('sourceRepo')}
            />
          </label>
          {form.formState.errors.sourceRepo && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.sourceRepo.message}</p>
          )}
        </div>

        {showAmplifyLambdaFields && (
          <>
            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                  {serverType === 'amplify' ? 'App ID' : 'Function Name'}
                </span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder={serverType === 'amplify' ? 'Enter Amplify App ID' : 'Enter Lambda function name'}
                  type="text"
                  autoComplete="off"
                  {...form.register(serverType === 'amplify' ? 'appId' : 'functionName')}
                />
              </label>
              {form.formState.errors.appId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.appId?.message}</p>
              )}
              {form.formState.errors.functionName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.functionName?.message}</p>
              )}
            </div>

            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Deployment URL</span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="https://example.com or https://function-name.execute-region.amazonaws.com"
                  type="url"
                  autoComplete="off"
                  {...form.register('deploymentUrl')}
                />
              </label>
              {form.formState.errors.deploymentUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.deploymentUrl.message}</p>
              )}
            </div>
          </>
        )}

        {credentialsList.length > 0 && (
          <div>
            <SearchableMultiSelect
              options={credentialsList.map((c) => ({ id: c.id, name: `${c.name} (${c.type})` }))}
              selectedIds={form.watch('credentialIds') || []}
              onChange={(selectedIds) => form.setValue('credentialIds', selectedIds)}
              placeholder="Search and select credentials..."
              label="Credentials (Optional)"
              disabled={isLoading}
            />
            {form.formState.errors.credentialIds && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.credentialIds?.message}</p>
            )}
          </div>
        )}

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

        {hasPermission('groups:update') && groups.length > 0 && (
          <div>
            <SearchableMultiSelect
              options={groups.map((g) => ({ id: g.id, name: g.name }))}
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
              Are you sure you want to delete this service? This action cannot be undone.
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
