import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { MaskedPasswordInput } from '../../../components/common/MaskedPasswordInput';
import { useCreateServer, useUpdateServer, useDeleteServer } from '../hooks/useServerMutations';
import { Trash2 } from 'lucide-react';
import type { Server } from '../../../services/servers';

const serverSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100, 'Server name must be 100 characters or less'),
  publicIp: z.string().min(1, 'Public IP is required').ip('Invalid IP address'),
  privateIp: z.string().min(1, 'Private IP is required').ip('Invalid IP address'),
  sshPort: z.coerce.number().int().min(1, 'SSH port must be between 1 and 65535').max(65535),
  username: z.string().min(1, 'Username is required').max(100, 'Username must be 100 characters or less'),
  password: z.string().optional(),
});

type ServerFormValues = z.infer<typeof serverSchema>;

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

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: server?.name || '',
      publicIp: server?.publicIp || '',
      privateIp: server?.privateIp || '',
      sshPort: server?.sshPort || 22,
      username: server?.username || '',
      password: '',
    },
  });

  // Reset form when server changes
  useEffect(() => {
    if (server) {
      form.reset({
        name: server.name,
        publicIp: server.publicIp,
        privateIp: server.privateIp,
        sshPort: server.sshPort,
        username: server.username,
        password: '', // Password is not sent in response, will be revealed via API
      });
    } else {
      form.reset({
        name: '',
        publicIp: '',
        privateIp: '',
        sshPort: 22,
        username: '',
        password: '',
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [server, form]);

  const onSubmit = async (values: ServerFormValues) => {
    setError(null);
    try {
      if (isEditing && server) {
        // Only include password if it's provided and not masked
        const updateData: any = {
          name: values.name,
          publicIp: values.publicIp,
          privateIp: values.privateIp,
          sshPort: values.sshPort,
          username: values.username,
        };
        // Only send password if it's provided and not empty
        if (values.password && values.password.trim()) {
          updateData.password = values.password;
        }
        await updateServer.mutateAsync({ id: server.id, data: updateData });
      } else {
        await createServer.mutateAsync(values);
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

  const isLoading = createServer.isPending || updateServer.isPending || deleteServer.isPending;

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

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Username</span>
            <input
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter SSH username"
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
            placeholder={isEditing ? 'Leave empty to keep current password' : 'Enter SSH password'}
            label={`Password ${isEditing ? '(leave empty to keep current password)' : ''}`}
            revealEndpoint={isEditing && server ? `/servers/${server.id}/reveal-password` : undefined}
            error={form.formState.errors.password?.message}
            disabled={isLoading}
          />
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

