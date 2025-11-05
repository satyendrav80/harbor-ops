import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateDomain, useUpdateDomain, useDeleteDomain } from '../hooks/useDomainMutations';
import { useAddItemToGroup, useRemoveItemFromGroup } from '../../groups/hooks/useGroupMutations';
import { getGroups, getGroupsByItem } from '../../../services/groups';
import { getTags } from '../../../services/tags';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { Trash2 } from 'lucide-react';
import type { Domain } from '../../../services/domains';

const domainSchema = z.object({
  name: z.string().min(1, 'Domain name is required').max(255, 'Domain name must be 255 characters or less'),
  tagIds: z.array(z.number()).optional(),
  groupIds: z.array(z.number()).optional(),
});

type DomainFormValues = z.infer<typeof domainSchema>;

type DomainModalProps = {
  isOpen: boolean;
  onClose: () => void;
  domain?: Domain | null;
  onDelete?: () => void;
};

export function DomainModal({ isOpen, onClose, domain, onDelete }: DomainModalProps) {
  const isEditing = !!domain;
  const createDomain = useCreateDomain();
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const addItemToGroup = useAddItemToGroup();
  const removeItemFromGroup = useRemoveItemFromGroup();
  const { hasPermission } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch groups for multi-select
  const { data: groupsData } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => getGroups({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('groups:view'),
  });

  // Fetch existing groups for this domain (if editing)
  const { data: existingGroupsData } = useQuery({
    queryKey: ['groups', 'domain', domain?.id],
    queryFn: async () => {
      if (!domain?.id) return [];
      return getGroupsByItem('domain', domain.id);
    },
    enabled: isOpen && isEditing && !!domain?.id && hasPermission('groups:view'),
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

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      name: domain?.name || '',
      tagIds: domain?.tags?.map((t) => t.id) || [],
      groupIds: [],
    },
  });

  // Reset form when modal opens/closes or domain changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (domain) {
      form.reset({
        name: domain.name,
        tagIds: domain.tags?.map((t) => t.id) || [],
        groupIds: existingGroupsData || [],
      });
    } else {
      form.reset({
        name: '',
        tagIds: [],
        groupIds: [],
      });
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, domain, form, existingGroupsData]);

  const onSubmit = async (values: DomainFormValues) => {
    setError(null);
    try {
      let createdOrUpdatedDomain: Domain;

      if (isEditing && domain) {
        createdOrUpdatedDomain = await updateDomain.mutateAsync({ 
          id: domain.id, 
          data: { 
            name: values.name,
            tagIds: values.tagIds || [],
          } 
        });
      } else {
        createdOrUpdatedDomain = await createDomain.mutateAsync({ 
          name: values.name,
          tagIds: values.tagIds || [],
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
              itemType: 'domain',
              itemId: createdOrUpdatedDomain.id,
            })
          )
        );
        
        // Remove from groups
        await Promise.all(
          groupsToRemove.map((groupId) =>
            removeItemFromGroup.mutateAsync({ groupId, itemId: createdOrUpdatedDomain.id })
          )
        );
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({ name: '', tagIds: [], groupIds: [] });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save domain');
    }
  };

  const confirmDelete = async () => {
    if (!domain) return;
    setError(null);
    try {
      await deleteDomain.mutateAsync(domain.id);
      setDeleteConfirmOpen(false);
      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete domain');
    }
  };

  const isLoading = createDomain.isPending || updateDomain.isPending || deleteDomain.isPending || addItemToGroup.isPending || removeItemFromGroup.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Domain' : 'Create Domain'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Domain Name */}
        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
              Domain Name <span className="text-red-500">*</span>
            </span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="example.com"
              type="text"
              autoComplete="off"
              {...form.register('name')}
            />
          </label>
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
          )}
        </div>

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

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Actions */}
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
        title="Delete Domain"
        message="Are you sure you want to delete this domain? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteDomain.isPending}
      />
    </Modal>
  );
}

