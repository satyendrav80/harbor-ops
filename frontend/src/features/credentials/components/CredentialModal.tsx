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
import { Trash2, Upload, Download, Copy, FileJson, FileText } from 'lucide-react';
import type { Credential } from '../../../services/credentials';
import { parseJSON, parseProperties, exportToJSON, exportToProperties, downloadFile, copyToClipboard, type BulkDataFormat } from '../../../utils/bulkDataUtils';

type CredentialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  credential?: Credential | null;
  onDelete?: () => void;
};

const credentialSchema = z.object({
  name: z.string().min(1, 'Credential name is required').max(100, 'Credential name must be 100 characters or less'),
  type: z.string().min(1, 'Credential type is required').max(50, 'Credential type must be 50 characters or less'),
  data: z.record(z.any()), // Validation will be done in onSubmit based on isEditing
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

  // Bulk import/export state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<BulkDataFormat>('json');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<BulkDataFormat>('json');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [dataStructureModified, setDataStructureModified] = useState(false); // Track if keys were added/removed

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
          setDataStructureModified(false); // Reset modification flag
        }
      } catch (e) {
        // If parsing fails, start with empty data
        setDataKeys([]);
        setDataValues({});
        form.setValue('data', {});
        setDataStructureModified(false); // Reset modification flag
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
      setDataStructureModified(false);
    }
    setError(null);
    setDeleteConfirmOpen(false);
    if (!isOpen) {
      // Assuming these states are defined elsewhere or are placeholders
      // setCreatedService(null);
      // setLocalDependencies([]);
    }
  }, [isOpen, credential, form, isEditing, existingGroupsData]);

  const addDataField = () => {
    const newKey = `key${dataKeys.length + 1}`;
    const updatedKeys = [...dataKeys, newKey];
    const updatedValues = { ...dataValues, [newKey]: '' };
    setDataKeys(updatedKeys);
    setDataValues(updatedValues);
    setDataStructureModified(true); // Mark as modified when adding a field
  };

  const removeDataField = (key: string) => {
    const newKeys = dataKeys.filter((k) => k !== key);
    const newValues = { ...dataValues };
    delete newValues[key];
    setDataKeys(newKeys);
    setDataValues(newValues);
    setDataStructureModified(true); // Mark as modified when removing a field

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

  const handleBulkImport = () => {
    setImportError(null);

    if (!importText.trim()) {
      setImportError('Please paste some data to import');
      return;
    }

    const parseResult = importFormat === 'json'
      ? parseJSON(importText)
      : parseProperties(importText);

    if (!parseResult.success) {
      setImportError(parseResult.error || 'Failed to parse data');
      return;
    }

    if (parseResult.data) {
      // Update dataKeys and dataValues with imported data
      const keys = Object.keys(parseResult.data);
      setDataKeys(keys);
      setDataValues(parseResult.data);
      setDataStructureModified(true); // Mark as modified when importing

      // Update form data
      form.setValue('data', parseResult.data, { shouldValidate: true });

      // Close import modal and reset
      setImportModalOpen(false);
      setImportText('');
      setImportError(null);
    }
  };

  const handleExport = async (method: 'download' | 'copy') => {
    // Build data object from current keys and values
    const dataObject: Record<string, string> = {};
    dataKeys.forEach((key) => {
      const keyTrimmed = key.trim();
      const value = dataValues[key];
      if (keyTrimmed !== '' && value !== undefined) {
        dataObject[keyTrimmed] = value;
      }
    });

    if (Object.keys(dataObject).length === 0) {
      setError('No data to export. Please add some key-value pairs first.');
      return;
    }

    const content = exportFormat === 'json'
      ? exportToJSON(dataObject)
      : exportToProperties(dataObject);

    const extension = exportFormat === 'json' ? 'json' : 'properties';
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/plain';

    try {
      if (method === 'download') {
        downloadFile(content, `credentials.${extension}`, mimeType);
      } else {
        await copyToClipboard(content);
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 2000);
      }
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const onSubmit = async (values: CredentialFormValues) => {
    setError(null);

    // Build data object from keys and values
    const dataObject: Record<string, any> = {};

    if (isEditing && dataStructureModified) {
      // When editing and structure was modified, include ALL keys (even with empty values)
      // This tells the backend which keys to keep and which to delete
      dataKeys.forEach((key) => {
        const keyTrimmed = key.trim();
        const value = dataValues[key];
        if (keyTrimmed !== '') {
          // Include the key even if value is empty (masked)
          // Empty/masked values will be skipped by backend (keeps existing encrypted value)
          // Keys not in this object will be deleted by backend
          dataObject[keyTrimmed] = value || '';
        }
      });
    } else {
      // For create or edit without structure changes, only include non-empty values
      dataKeys.forEach((key) => {
        const keyTrimmed = key.trim();
        const value = dataValues[key];
        if (keyTrimmed !== '' && value !== undefined && value.trim() !== '') {
          dataObject[keyTrimmed] = value;
        }
      });
    }

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
            // Send data if structure was modified (keys added/removed) or if there are non-empty values
            ...(dataStructureModified || Object.keys(dataObject).length > 0 ? { data: dataObject } : {}),
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
          <div className="flex items-center justify-between mb-3">
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal text-gray-900 dark:text-white">Credential Data</span>
            </label>
            <div className="flex items-center gap-2">
              {/* Import Button */}
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Bulk Import
              </button>

              {/* Export Dropdown */}
              <div className="relative inline-block">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as BulkDataFormat)}
                  className="appearance-none px-2 py-1.5 pr-6 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-l-lg focus:outline-0 focus:ring-2 focus:ring-primary/50"
                >
                  <option value="json">JSON</option>
                  <option value="properties">Properties</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleExport('download')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-l-0 border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Download as file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleExport('copy')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-l-0 border-gray-200 dark:border-gray-700/50 rounded-r-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showExportSuccess && (
            <div className="mb-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2">
              <p className="text-xs text-green-800 dark:text-green-200">Copied to clipboard!</p>
            </div>
          )}

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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(form.formState.errors.data.message || 'Invalid data')}</p>
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

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportText('');
          setImportError(null);
        }}
        title="Bulk Import Credential Data"
        size="xl"
      >
        <div className="space-y-4">
          {importError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{importError}</p>
            </div>
          )}

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Format</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="json"
                  checked={importFormat === 'json'}
                  onChange={(e) => setImportFormat(e.target.value as BulkDataFormat)}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <FileJson className="w-4 h-4" />
                <span className="text-sm text-gray-900 dark:text-white">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="properties"
                  checked={importFormat === 'properties'}
                  onChange={(e) => setImportFormat(e.target.value as BulkDataFormat)}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <FileText className="w-4 h-4" />
                <span className="text-sm text-gray-900 dark:text-white">Properties</span>
              </label>
            </div>
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
                Paste your data below
              </span>
            </label>
            <textarea
              className="form-input w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50 font-mono resize-y"
              placeholder={importFormat === 'json'
                ? '{\n  "username": "admin",\n  "password": "secret123",\n  "api_key": "abc-xyz"\n}'
                : 'username=admin\npassword=secret123\napi_key=abc-xyz'
              }
              rows={12}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {importFormat === 'json'
                ? 'Paste a JSON object with key-value pairs. Example: {"key1": "value1", "key2": "value2"}'
                : 'Paste properties in key=value format, one per line. Example: key1=value1'
              }
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(false);
                setImportText('');
                setImportError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkImport}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
