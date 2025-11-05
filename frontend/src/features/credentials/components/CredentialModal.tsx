import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateCredential, useUpdateCredential, useDeleteCredential } from '../hooks/useCredentialMutations';
import { useAddItemToGroup, useRemoveItemFromGroup } from '../../groups/hooks/useGroupMutations';
import { getGroups, getGroupsByItem } from '../../../services/groups';
import { getTags } from '../../../services/tags';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { Trash2 } from 'lucide-react';
import type { Credential } from '../../../services/credentials';

type CredentialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  credential?: Credential | null;
  onDelete?: () => void;
};

const credentialSchema = z.object({
  name: z.string().min(1, 'Credential name is required').max(100, 'Credential name must be 100 characters or less'),
  type: z.string().min(1, 'Credential type is required').max(50, 'Credential type must be 50 characters or less'),
  data: z.record(z.any()).refine((data) => Object.keys(data).length > 0, 'Credential data is required'),
  tagIds: z.array(z.number()).optional(),
  groupIds: z.array(z.number()).optional(),
});

type CredentialFormValues = z.infer<typeof credentialSchema>;

export function CredentialModal({ isOpen, onClose, credential, onDelete }: CredentialModalProps) {
  const isEditing = !!credential;
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const deleteCredential = useDeleteCredential();
  const addItemToGroup = useAddItemToGroup();
  const removeItemFromGroup = useRemoveItemFromGroup();
  const { hasPermission } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dataKeys, setDataKeys] = useState<string[]>([]);
  const [dataValues, setDataValues] = useState<Record<string, string>>({});

  // Fetch groups for multi-select
  const { data: groupsData } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => getGroups({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && hasPermission('groups:view'),
  });

  // Fetch existing groups for this credential (if editing)
  const { data: existingGroupsData } = useQuery({
    queryKey: ['groups', 'credential', credential?.id],
    queryFn: async () => {
      if (!credential?.id) return [];
      return getGroupsByItem('credential', credential.id);
    },
    enabled: isOpen && isEditing && !!credential?.id && hasPermission('groups:view'),
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

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: credential?.name || '',
      type: credential?.type || '',
      data: {},
      tagIds: credential?.tags?.map((t) => t.id) || [],
      groupIds: [],
    },
  });

  // Reset form when modal opens/closes or credential changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (credential && isEditing) {
      form.reset({
        name: credential.name,
        type: credential.type,
        data: {},
        tagIds: credential.tags?.map((t) => t.id) || [],
        groupIds: existingGroupsData || [],
      });
      
      // Parse credential data (it's masked, but we'll show keys for editing)
      try {
        const parsedData = credential.data || {};
        
        if (typeof parsedData === 'object' && parsedData !== null) {
          const keys = Object.keys(parsedData);
          setDataKeys(keys);
          const values: Record<string, string> = {};
          keys.forEach((key) => {
            // Data is masked, so we'll show empty fields (user can fill them to update)
            values[key] = '';
          });
          setDataValues(values);
          form.setValue('data', parsedData);
        }
      } catch (e) {
        // If parsing fails, start with empty data
        setDataKeys([]);
        setDataValues({});
        form.setValue('data', {});
      }
    } else {
      form.reset({
        name: '',
        type: '',
        data: {},
        tagIds: [],
        groupIds: [],
      });
      setDataKeys([]);
      setDataValues({});
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, credential, form, isEditing, existingGroupsData]);

  const addDataField = () => {
    const newKey = `key${dataKeys.length + 1}`;
    const updatedKeys = [...dataKeys, newKey];
    const updatedValues = { ...dataValues, [newKey]: '' };
    setDataKeys(updatedKeys);
    setDataValues(updatedValues);
  };

  const removeDataField = (key: string) => {
    const newKeys = dataKeys.filter((k) => k !== key);
    const newValues = { ...dataValues };
    delete newValues[key];
    setDataKeys(newKeys);
    setDataValues(newValues);
    
    // Update form data field for validation (only include non-empty keys with non-empty values)
    const dataObject: Record<string, any> = {};
    newKeys.forEach((k) => {
      const kTrimmed = k.trim();
      const v = newValues[k];
      if (kTrimmed !== '' && v !== undefined && v.trim() !== '') {
        dataObject[kTrimmed] = v;
      }
    });
    form.setValue('data', dataObject, { shouldValidate: true });
  };

  const updateDataValue = (key: string, value: string) => {
    const newValues = { ...dataValues, [key]: value };
    setDataValues(newValues);
    
    // Update form data field for validation (only include non-empty keys with non-empty values)
    const dataObject: Record<string, any> = {};
    dataKeys.forEach((k) => {
      const kTrimmed = k.trim();
      const v = newValues[k];
      if (kTrimmed !== '' && v !== undefined && v.trim() !== '') {
        dataObject[kTrimmed] = v;
      }
    });
    form.setValue('data', dataObject, { shouldValidate: true });
  };

  const onSubmit = async (values: CredentialFormValues) => {
    setError(null);
    
    // Build data object from keys and values (only include non-empty keys with non-empty values)
    const dataObject: Record<string, any> = {};
    dataKeys.forEach((key) => {
      const keyTrimmed = key.trim();
      const value = dataValues[key];
      if (keyTrimmed !== '' && value !== undefined && value.trim() !== '') {
        dataObject[keyTrimmed] = value;
      }
    });
    
    // Validate data has at least one non-empty key-value pair (only required on create, not update)
    if (!isEditing && Object.keys(dataObject).length === 0) {
      form.setError('data', { message: 'Credential data is required. Please add at least one key-value pair with both key and value filled.' });
      return;
    }
    
    // Clear any previous errors
    form.clearErrors('data');
    
    try {

      let createdOrUpdatedCredential: Credential;

      if (isEditing && credential) {
        createdOrUpdatedCredential = await updateCredential.mutateAsync({
          id: credential.id,
          data: {
            name: values.name,
            type: values.type,
            // Only send data if there are changes (allow partial updates)
            ...(Object.keys(dataObject).length > 0 ? { data: dataObject } : {}),
            tagIds: values.tagIds || [],
          },
        });
      } else {
        createdOrUpdatedCredential = await createCredential.mutateAsync({
          name: values.name,
          type: values.type,
          data: dataObject,
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
              itemType: 'credential',
              itemId: createdOrUpdatedCredential.id,
            })
          )
        );
        
        // Remove from groups
        await Promise.all(
          groupsToRemove.map((groupId) =>
            removeItemFromGroup.mutateAsync({ groupId, itemId: createdOrUpdatedCredential.id })
          )
        );
      }

      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          name: '',
          type: '',
          data: {},
          tagIds: [],
          groupIds: [],
        });
        setDataKeys([]);
        setDataValues({});
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} credential`);
    }
  };

  const confirmDelete = async () => {
    if (!credential) return;
    setError(null);
    try {
      await deleteCredential.mutateAsync(credential.id);
      setDeleteConfirmOpen(false);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete credential');
    }
  };

  const isLoading = createCredential.isPending || updateCredential.isPending || deleteCredential.isPending || addItemToGroup.isPending || removeItemFromGroup.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Credential' : 'Create Credential'} size="full">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Credential Name</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter credential name"
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
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Credential Type</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., AWS, Database, API Key"
              type="text"
              autoComplete="off"
              {...form.register('type')}
            />
          </label>
          {form.formState.errors.type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.type.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Credential Data</span>
          </label>
          <div className="space-y-2">
            {dataKeys.map((key, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  className="form-input flex-1 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="Key"
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newKeys = [...dataKeys];
                    const oldKey = key;
                    const newKey = e.target.value;
                    newKeys[index] = newKey;
                    
                    const newValues = { ...dataValues };
                    newValues[newKey] = dataValues[oldKey] || '';
                    delete newValues[oldKey];
                    
                    setDataKeys(newKeys);
                    setDataValues(newValues);
                    
                    // Update form data field for validation (only include non-empty keys with non-empty values)
                    const dataObject: Record<string, any> = {};
                    newKeys.forEach((k) => {
                      const kTrimmed = k.trim();
                      const v = newValues[k];
                      if (kTrimmed !== '' && v !== undefined && v.trim() !== '') {
                        dataObject[kTrimmed] = v;
                      }
                    });
                    form.setValue('data', dataObject, { shouldValidate: true });
                  }}
                />
                <textarea
                  className="form-input flex-1 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] min-h-[2.5rem] px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
                  placeholder="Value (multiline supported)"
                  rows={1}
                  value={dataValues[key] || ''}
                  onChange={(e) => updateDataValue(key, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeDataField(key)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2"
                  aria-label="Remove field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addDataField}
              className="w-full px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 border border-primary rounded-lg transition-colors"
            >
              + Add Field
            </button>
          </div>
          {form.formState.errors.data && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.data.message}</p>
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
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Credential"
        message="Are you sure you want to delete this credential? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteCredential.isPending}
      />
    </Modal>
  );
}
