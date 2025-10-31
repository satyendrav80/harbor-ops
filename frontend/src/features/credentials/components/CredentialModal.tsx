import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreateCredential, useUpdateCredential, useDeleteCredential } from '../hooks/useCredentialMutations';
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
});

type CredentialFormValues = z.infer<typeof credentialSchema>;

export function CredentialModal({ isOpen, onClose, credential, onDelete }: CredentialModalProps) {
  const isEditing = !!credential;
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const deleteCredential = useDeleteCredential();
  
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dataKeys, setDataKeys] = useState<string[]>([]);
  const [dataValues, setDataValues] = useState<Record<string, string>>({});

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: credential?.name || '',
      type: credential?.type || '',
      data: {},
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
      });
      
      // Parse credential data (it's masked, but we'll allow editing)
      try {
        const parsedData = typeof credential.data === 'string' 
          ? JSON.parse(credential.data) 
          : credential.data;
        
        if (typeof parsedData === 'object' && parsedData !== null) {
          const keys = Object.keys(parsedData);
          setDataKeys(keys);
          const values: Record<string, string> = {};
          keys.forEach((key) => {
            // Data is masked, so we'll show empty fields
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
      });
      setDataKeys([]);
      setDataValues({});
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [isOpen, credential, form, isEditing]);

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
        dataObject[kTrimmed] = v.trim();
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
        dataObject[kTrimmed] = v.trim();
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
        dataObject[keyTrimmed] = value.trim();
      }
    });
    
    // Validate data has at least one non-empty key-value pair
    if (Object.keys(dataObject).length === 0) {
      form.setError('data', { message: 'Credential data is required. Please add at least one key-value pair with both key and value filled.' });
      return;
    }
    
    // Clear any previous errors
    form.clearErrors('data');
    
    try {

      if (isEditing && credential) {
        await updateCredential.mutateAsync({
          id: credential.id,
          data: {
            name: values.name,
            type: values.type,
            data: dataObject,
          },
        });
      } else {
        await createCredential.mutateAsync({
          name: values.name,
          type: values.type,
          data: dataObject,
        });
      }

      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          name: '',
          type: '',
          data: {},
        });
        setDataKeys([]);
        setDataValues({});
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} credential`);
    }
  };

  const handleDelete = async () => {
    if (!credential) return;
    setError(null);
    try {
      await deleteCredential.mutateAsync(credential.id);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete credential');
    }
  };

  const isLoading = createCredential.isPending || updateCredential.isPending || deleteCredential.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Credential' : 'Create Credential'}>
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
                        dataObject[kTrimmed] = v.trim();
                      }
                    });
                    form.setValue('data', dataObject, { shouldValidate: true });
                  }}
                />
                <input
                  className="form-input flex-1 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  placeholder="Value"
                  type="password"
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
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#1C252E] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this credential? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
