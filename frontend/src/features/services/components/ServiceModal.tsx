import { useEffect, useState } from 'react';
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

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Service name must be 100 characters or less'),
  port: z.coerce.number().int().min(1, 'Port must be between 1 and 65535').max(65535),
  serverId: z.coerce.number().int().min(1, 'Server is required'),
  credentialId: z.coerce.number().int().optional().nullable(),
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
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch servers and credentials for dropdowns
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'all'],
    queryFn: () => getServers(1, 1000),
    staleTime: 5 * 60 * 1000,
  });

  const { data: credentials } = useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: () => getCredentials(),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || '',
      port: service?.port || 80,
      serverId: service?.serverId || 0,
      credentialId: service?.credentialId || null,
    },
  });

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        port: service.port,
        serverId: service.serverId,
        credentialId: service.credentialId || null,
      });
    } else {
      form.reset({
        name: '',
        port: 80,
        serverId: 0,
        credentialId: null,
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [service, form]);

  const onSubmit = async (values: ServiceFormValues) => {
    setError(null);
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({
          id: service.id,
          data: {
            name: values.name,
            port: values.port,
            serverId: values.serverId,
            credentialId: values.credentialId || null,
          },
        });
      } else {
        await createService.mutateAsync({
          name: values.name,
          port: values.port,
          serverId: values.serverId,
          credentialId: values.credentialId || null,
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

  const isLoading = createService.isPending || updateService.isPending || deleteService.isPending;
  const servers = serversData?.data || [];
  const credentialsList = Array.isArray(credentials) ? credentials : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Service' : 'Create Service'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} ({server.publicIp})
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.serverId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.serverId.message}</p>
          )}
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Credential (Optional)</span>
            <select
              className="form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              {...form.register('credentialId', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            >
              <option value="">No credential</option>
              {credentialsList.map((credential) => (
                <option key={credential.id} value={credential.id}>
                  {credential.name} ({credential.type})
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.credentialId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.credentialId?.message}</p>
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

