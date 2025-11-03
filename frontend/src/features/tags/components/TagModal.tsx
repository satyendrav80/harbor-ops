import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useTagMutations';
import { Trash2 } from 'lucide-react';
import type { Tag } from '../../../services/tags';
import { useWatch } from 'react-hook-form';

type TagModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tag?: Tag | null;
  onDelete?: () => void;
};

const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100, 'Tag name must be 100 characters or less'),
  value: z.string().max(500, 'Tag value must be 500 characters or less').optional().nullable(),
  color: z.string().max(7).optional().nullable(), // Hex color code
});

type TagFormValues = z.infer<typeof tagSchema>;

export function TagModal({ isOpen, onClose, tag, onDelete }: TagModalProps) {
  const isEditing = !!tag;
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: tag?.name || '',
      value: tag?.value || null,
      color: tag?.color || null,
    },
  });

  // Watch color value to sync between inputs
  const colorValue = useWatch({
    control: form.control,
    name: 'color',
    defaultValue: tag?.color || null,
  });

  // Reset form when modal opens/closes or tag changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (tag) {
      form.reset({
        name: tag.name,
        value: tag.value || null,
        color: tag.color || null,
      });
    } else {
      form.reset({
        name: '',
        value: null,
        color: null,
      });
    }
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, tag, form]);

  const onSubmit = async (values: TagFormValues) => {
    setError(null);
    try {
      // Normalize color: trim and convert empty strings to null
      const normalizedColor = values.color && values.color.trim() ? values.color.trim() : null;
      
      if (isEditing && tag) {
        await updateTag.mutateAsync({
          id: tag.id,
          data: {
            name: values.name,
            value: values.value || null,
            color: normalizedColor,
          },
        });
      } else {
        await createTag.mutateAsync({
          name: values.name,
          value: values.value || null,
          color: normalizedColor,
        });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          name: '',
          value: null,
          color: null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'create'} tag`);
    }
  };

  const confirmDelete = async () => {
    if (!tag) return;
    setError(null);
    try {
      await deleteTag.mutateAsync(tag.id);
      setDeleteConfirmOpen(false);
      onClose();
      if (onDelete) onDelete();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete tag');
    }
  };

  const isLoading = createTag.isPending || updateTag.isPending || deleteTag.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Tag' : 'Create Tag'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Tag Name */}
          <div>
            <label htmlFor="tag-name" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Tag Name *
            </label>
            <input
              id="tag-name"
              type="text"
              {...form.register('name')}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter tag name"
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Tag Value */}
          <div>
            <label htmlFor="tag-value" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Tag Value (Optional)
            </label>
            <input
              id="tag-value"
              type="text"
              {...form.register('value')}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter tag value (optional)"
              disabled={isLoading}
            />
            {form.formState.errors.value && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.value.message}</p>
            )}
          </div>

          {/* Tag Color */}
          <div>
            <label htmlFor="tag-color" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Tag Color (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tag-color"
                type="color"
                value={colorValue && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(colorValue) ? colorValue : '#000000'}
                onChange={(e) => {
                  const value = e.target.value;
                  // Always set the value from color picker (it always returns a valid hex)
                  form.setValue('color', value, { shouldDirty: true, shouldValidate: true });
                }}
                className="h-10 w-20 cursor-pointer rounded border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              />
              <input
                type="text"
                value={colorValue || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  form.setValue('color', value === '' ? null : value, { shouldDirty: true, shouldValidate: true });
                }}
                onBlur={(e) => {
                  // Validate hex color format on blur
                  const value = e.target.value.trim();
                  if (value && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(value)) {
                    // Invalid format, clear it
                    form.setValue('color', null, { shouldDirty: true, shouldValidate: true });
                  }
                }}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="#FF0000 or leave empty"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => {
                  form.setValue('color', null, { shouldDirty: true, shouldValidate: true });
                }}
                disabled={isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                None
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select a color to visually identify resources with this tag (e.g., yellow for deprecated)
            </p>
            {form.formState.errors.color && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.color.message}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
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
        </div>
      </form>
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTag.isPending}
      />
    </Modal>
  );
}

