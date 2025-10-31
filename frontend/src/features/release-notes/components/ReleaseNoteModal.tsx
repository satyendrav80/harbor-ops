import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useCreateReleaseNote, useUpdateReleaseNote } from '../hooks/useReleaseNoteMutations';
import type { ReleaseNote } from '../../../services/releaseNotes';
import type { Service } from '../../../services/services';

type ReleaseNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  releaseNote?: ReleaseNote | null;
  services: Service[];
};

const releaseNoteSchema = z.object({
  serviceId: z.number().min(1, 'Service is required'),
  note: z.string().min(1, 'Release note is required').max(5000, 'Release note must be 5000 characters or less'),
  publishDate: z.string().min(1, 'Publish date is required'),
});

type ReleaseNoteFormValues = z.infer<typeof releaseNoteSchema>;

export function ReleaseNoteModal({ isOpen, onClose, releaseNote, services }: ReleaseNoteModalProps) {
  const isEditing = !!releaseNote;
  const createReleaseNote = useCreateReleaseNote();
  const updateReleaseNote = useUpdateReleaseNote();
  
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ReleaseNoteFormValues>({
    resolver: zodResolver(releaseNoteSchema),
    defaultValues: {
      serviceId: releaseNote?.serviceId || 0,
      note: releaseNote?.note || '',
      publishDate: releaseNote?.publishDate
        ? new Date(releaseNote.publishDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    },
  });

  // Reset form when modal opens/closes or releaseNote changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (releaseNote) {
      form.reset({
        serviceId: releaseNote.serviceId,
        note: releaseNote.note,
        publishDate: releaseNote.publishDate
          ? new Date(releaseNote.publishDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
    } else {
      form.reset({
        serviceId: 0,
        note: '',
        publishDate: new Date().toISOString().slice(0, 16),
      });
    }
    setError(null);
  }, [isOpen, releaseNote, form]);

  const onSubmit = async (values: ReleaseNoteFormValues) => {
    setError(null);
    try {
      if (isEditing && releaseNote) {
        await updateReleaseNote.mutateAsync({
          id: releaseNote.id,
          note: values.note,
          publishDate: values.publishDate,
        });
      } else {
        await createReleaseNote.mutateAsync({
          serviceId: values.serviceId,
          note: values.note,
          publishDate: values.publishDate,
        });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          serviceId: 0,
          note: '',
          publishDate: new Date().toISOString().slice(0, 16),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} release note`);
    }
  };

  const isLoading = createReleaseNote.isPending || updateReleaseNote.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Release Note' : 'Create Release Note'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Service Selection (only on create) */}
          {!isEditing && (
            <div>
              <label htmlFor="service-id" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Service *
              </label>
              <select
                id="service-id"
                {...form.register('serviceId', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              >
                <option value={0}>Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} (:{service.port})
                  </option>
                ))}
              </select>
              {form.formState.errors.serviceId && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.serviceId.message}
                </p>
              )}
            </div>
          )}

          {/* Publish Date */}
          <div>
            <label htmlFor="publish-date" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Publish Date *
            </label>
            <input
              id="publish-date"
              type="datetime-local"
              {...form.register('publishDate')}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isLoading}
            />
            {form.formState.errors.publishDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.publishDate.message}</p>
            )}
          </div>

          {/* Release Note */}
          <div>
            <label htmlFor="release-note" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Release Note *
            </label>
            <textarea
              id="release-note"
              {...form.register('note')}
              rows={8}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Enter release note description..."
              disabled={isLoading}
            />
            {form.formState.errors.note && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.note.message}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

