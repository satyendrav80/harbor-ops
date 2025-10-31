import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreateDomain, useUpdateDomain, useDeleteDomain } from '../hooks/useDomainMutations';
import { Trash2 } from 'lucide-react';
import type { Domain } from '../../../services/domains';

const domainSchema = z.object({
  name: z.string().min(1, 'Domain name is required').max(255, 'Domain name must be 255 characters or less'),
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

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      name: domain?.name || '',
    },
  });

  // Reset form when modal opens/closes or domain changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (domain) {
      form.reset({
        name: domain.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [isOpen, domain, form]);

  const onSubmit = async (values: DomainFormValues) => {
    setError(null);
    try {
      if (isEditing && domain) {
        await updateDomain.mutateAsync({ id: domain.id, data: { name: values.name } });
      } else {
        await createDomain.mutateAsync({ name: values.name });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({ name: '' });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save domain');
    }
  };

  const handleDelete = async () => {
    if (!domain) return;
    setError(null);
    try {
      await deleteDomain.mutateAsync(domain.id);
      setShowDeleteConfirm(false);
      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete domain');
    }
  };

  const isLoading = createDomain.isPending || updateDomain.isPending || deleteDomain.isPending;

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
              Are you sure you want to delete this domain? This action cannot be undone.
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
                disabled={deleteDomain.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteDomain.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && !showDeleteConfirm && (
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
    </Modal>
  );
}

