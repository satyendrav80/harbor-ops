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
import { getTags } from '../../../services/tags';
import { ServiceDependencies } from './ServiceDependencies';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Service name must be 100 characters or less'),
  port: z.coerce.number().int().min(1, 'Port must be between 1 and 65535').max(65535),
  external: z.boolean().optional().default(false),
  serverIds: z.array(z.number()).min(1, 'At least one server is required'),
  credentialIds: z.array(z.number()).optional(),
  domainIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
  sourceRepo: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  }),
  appId: z.string().optional().nullable(),
  functionName: z.string().optional().nullable(),
  deploymentUrl: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  }),
  documentationUrl: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
    message: 'Invalid URL',
  }),
  documentation: z.string().optional().nullable(),
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
  const [createdService, setCreatedService] = useState<Service | null>(null);

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

  // Fetch tags for multi-select
  const { data: tagsData } = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: async () => {
      const response = await getTags(1, 1000);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('tags:view'),
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || '',
      port: service?.port || 80,
      external: service?.external || false,
      serverIds: service?.servers?.map((ss) => ss.server.id) || [],
      credentialIds: [],
      domainIds: [],
      tagIds: [],
      sourceRepo: service?.sourceRepo || '',
      appId: service?.appId || '',
      functionName: service?.functionName || '',
      deploymentUrl: service?.deploymentUrl || '',
      documentationUrl: service?.documentationUrl || '',
      documentation: service?.documentation || '',
      groupIds: [],
    },
  });

  // Tiptap editor for documentation
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Link is already included in StarterKit, so we configure it here
        link: {
          openOnClick: false,
        },
      }),
      TextStyle,
      Color,
      Highlight,
    ],
    content: service?.documentation || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-2 text-sm text-gray-900 dark:text-white',
        style: 'white-space: pre-wrap;',
      },
    },
    onUpdate: ({ editor }) => {
      form.setValue('documentation', editor.getHTML(), { shouldDirty: true });
    },
  });

  // Get selected servers to show type-specific fields
  const selectedServerIds = form.watch('serverIds');
  const selectedServers = useMemo(() => {
    if (!selectedServerIds || selectedServerIds.length === 0 || !serversData?.data) return [];
    return serversData.data.filter((s) => selectedServerIds.includes(s.id));
  }, [selectedServerIds, serversData]);

  // Show amplify/lambda fields if ANY selected server is amplify or lambda
  const showAmplifyLambdaFields = useMemo(() => {
    return selectedServers.some((s) => s.type === 'amplify' || s.type === 'lambda');
  }, [selectedServers]);

  // Check if any selected server is amplify
  const hasAmplifyServer = useMemo(() => {
    return selectedServers.some((s) => s.type === 'amplify');
  }, [selectedServers]);

  // Check if any selected server is lambda
  const hasLambdaServer = useMemo(() => {
    return selectedServers.some((s) => s.type === 'lambda');
  }, [selectedServers]);

  // Reset type-specific fields when server types change
  useEffect(() => {
    if (!selectedServerIds || selectedServerIds.length === 0) {
      // Reset type-specific fields when no server is selected
      form.setValue('appId', '');
      form.setValue('functionName', '');
      return;
    }

    if (!showAmplifyLambdaFields) {
      // Clear amplify/lambda specific fields when no selected server supports them
      form.setValue('appId', '');
      form.setValue('functionName', '');
    }
  }, [selectedServerIds, showAmplifyLambdaFields, form]);

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        port: service.port,
        external: service.external || false,
        serverIds: service.servers?.map((ss) => ss.server.id) || [],
        credentialIds: service.credentials?.map((sc) => sc.credential.id) || [],
        domainIds: existingDomainsData || [],
        tagIds: service.tags?.map((st) => st.tag.id) || [],
        sourceRepo: service.sourceRepo || '',
        appId: service.appId || '',
        functionName: service.functionName || '',
        deploymentUrl: service.deploymentUrl || '',
        documentationUrl: service.documentationUrl || '',
        documentation: service.documentation || '',
        groupIds: existingGroupsData || [],
      });
      // Update editor content when service changes
      if (editor) {
        editor.commands.setContent(service.documentation || '');
      }
    } else {
      form.reset({
        name: '',
        port: 80,
        external: false,
        serverIds: [],
        credentialIds: [],
        domainIds: [],
        tagIds: [],
        sourceRepo: '',
        appId: '',
        functionName: '',
        deploymentUrl: '',
        documentationUrl: '',
        documentation: '',
        groupIds: [],
      });
      // Clear editor when creating new service
      if (editor) {
        editor.commands.setContent('');
      }
    }
    setError(null);
    setShowDeleteConfirm(false);
    if (!isOpen) {
      setCreatedService(null); // Reset created service when modal closes
    }
  }, [isOpen, service, form, existingGroupsData, existingDomainsData, editor]);

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
            external: values.external,
            serverIds: values.serverIds,
            credentialIds: values.credentialIds || [],
            domainIds: values.domainIds || [],
            tagIds: values.tagIds || [],
            sourceRepo: values.sourceRepo || null,
            appId: values.appId || null,
            functionName: values.functionName || null,
            deploymentUrl: values.deploymentUrl || null,
            documentationUrl: values.documentationUrl || null,
            documentation: values.documentation || null,
          },
        });
      } else {
        createdOrUpdatedService = await createService.mutateAsync({
          name: values.name,
          port: values.port,
          external: values.external,
          serverIds: values.serverIds,
          credentialIds: values.credentialIds || [],
          domainIds: values.domainIds || [],
          tagIds: values.tagIds || [],
          sourceRepo: values.sourceRepo || null,
          appId: values.appId || null,
          functionName: values.functionName || null,
          deploymentUrl: values.deploymentUrl || null,
          documentationUrl: values.documentationUrl || null,
          documentation: values.documentation || null,
        });
      }

      // Store created service for dependencies management
      if (!isEditing) {
        setCreatedService(createdOrUpdatedService);
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
      // Don't close modal after creation if service was just created - allow adding dependencies
      if (!isEditing) {
        form.reset({
          name: '',
          port: 80,
          external: false,
          serverIds: [],
          credentialIds: [],
          domainIds: [],
          tagIds: [],
          sourceRepo: '',
          appId: '',
          functionName: '',
          deploymentUrl: '',
          documentationUrl: '',
          documentation: '',
          groupIds: [],
        });
        // Don't close modal - user can now add dependencies
        // onClose(); // Commented out to allow dependency management
      } else {
        onClose();
      }
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('external')}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">External Service</span>
          </label>
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
          <SearchableMultiSelect
            options={
              serversData?.data?.map((server) => {
                const serverTypeLabel = constants?.serverTypeLabels[server.type] || server.type;
                const displayName = `${server.name} (${serverTypeLabel}) - ${server.publicIp || server.endpoint || 'N/A'}`;
                return { id: server.id, name: displayName };
              }) || []
            }
            selectedIds={form.watch('serverIds')}
            onChange={(selectedIds) => {
              form.setValue('serverIds', selectedIds, { shouldDirty: true });
            }}
            label="Servers *"
            placeholder="Select one or more servers..."
            disabled={isLoading || !serversData?.data}
          />
          {form.formState.errors.serverIds && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.serverIds.message}</p>
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

        {/* Amplify-specific fields */}
        {hasAmplifyServer && (
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">App ID</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                placeholder="Enter Amplify App ID"
                type="text"
                autoComplete="off"
                {...form.register('appId')}
              />
            </label>
            {form.formState.errors.appId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.appId?.message}</p>
            )}
          </div>
        )}

        {/* Lambda-specific fields */}
        {hasLambdaServer && (
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Function Name</span>
              <input
                className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                placeholder="Enter Lambda function name"
                type="text"
                autoComplete="off"
                {...form.register('functionName')}
              />
            </label>
            {form.formState.errors.functionName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.functionName?.message}</p>
            )}
          </div>
        )}

        {/* Deployment URL - shown for amplify and lambda */}
        {showAmplifyLambdaFields && (
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

        {hasPermission('tags:view') && tagsData && tagsData.length > 0 && (
          <div>
            <SearchableMultiSelect
              options={tagsData.map((t) => ({ id: t.id, name: t.value ? `${t.name}:${t.value}` : t.name }))}
              selectedIds={form.watch('tagIds') || []}
              onChange={(selectedIds) => form.setValue('tagIds', selectedIds)}
              placeholder="Search and select tags..."
              label="Tags (Optional)"
              disabled={isLoading}
            />
            {form.formState.errors.tagIds && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.tagIds?.message}</p>
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

        {/* Documentation Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Documentation & Rules</h3>
            
            {/* External Documentation Link */}
            <div className="mb-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                  External Documentation Link (Optional)
                </span>
                <input
                  className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="https://docs.example.com/service-rules"
                  type="url"
                  autoComplete="off"
                  {...form.register('documentationUrl')}
                />
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Provide a link to external documentation or rules for this service
              </p>
              {form.formState.errors.documentationUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.documentationUrl.message}</p>
              )}
            </div>

            {/* Inline Documentation Editor */}
            <div>
              <label className="block text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                Inline Documentation (Optional)
              </label>
              <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg overflow-hidden">
                {/* Toolbar */}
                {editor && (
                  <div className="border-b border-gray-200 dark:border-gray-700/50 p-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      disabled={!editor.can().chain().focus().toggleBold().run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('bold')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      disabled={!editor.can().chain().focus().toggleItalic().run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('italic')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      disabled={!editor.can().chain().focus().toggleStrike().run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('strike')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <s>S</s>
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('heading', { level: 1 })
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('heading', { level: 2 })
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('heading', { level: 3 })
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      H3
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('bulletList')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('orderedList')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      1.
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt('Enter URL:');
                        if (url) {
                          editor.chain().focus().setLink({ href: url }).run();
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded border ${
                        editor.isActive('link')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                      disabled={!editor.isActive('link')}
                      className="px-2 py-1 text-xs rounded border bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      Unlink
                    </button>
                  </div>
                )}
                {/* Editor Content */}
                <EditorContent editor={editor} className="min-h-[200px]" />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use the editor above to write documentation, rules, or guidelines directly
              </p>
            </div>
          </div>
        </div>

        {/* Service Dependencies - Show during creation and editing */}
        {(isEditing ? service?.id : createdService?.id) ? (
          <ServiceDependencies 
            serviceId={(isEditing ? service?.id : createdService?.id) || null} 
            dependencies={(isEditing ? service?.dependencies : createdService?.dependencies) || []} 
          />
        ) : (
          <ServiceDependencies serviceId={null} dependencies={[]} />
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
