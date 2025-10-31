import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { useAddItemToGroup } from '../hooks/useGroupMutations';
import { getServers } from '../../../services/servers';
import { getServices } from '../../../services/services';
import { useQuery } from '@tanstack/react-query';
import type { Server } from '../../../services/servers';
import type { Service } from '../../../services/services';

const itemSchema = z.object({
  itemType: z.enum(['server', 'service']),
  itemId: z.number().min(1, 'Please select an item'),
});

type ItemFormValues = z.infer<typeof itemSchema>;

type GroupItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  existingItemIds?: Array<{ itemType: 'server' | 'service'; itemId: number }>;
};

export function GroupItemModal({ isOpen, onClose, groupId, existingItemIds = [] }: GroupItemModalProps) {
  const addItem = useAddItemToGroup();
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'server' | 'service'>('server');

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      itemType: 'server',
      itemId: 0,
    },
  });

  // Fetch servers and services
  const { data: serversResponse } = useQuery({
    queryKey: ['servers'],
    queryFn: getServers,
    enabled: isOpen && selectedType === 'server',
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    enabled: isOpen && selectedType === 'service',
  });

  // Extract arrays from paginated responses
  const servers = serversResponse?.data || [];
  const services = servicesResponse?.data || [];

  // Filter out items that are already in the group
  const availableServers = servers.filter(
    (server) => !existingItemIds.some((item) => item.itemType === 'server' && item.itemId === server.id)
  );
  const availableServices = services.filter(
    (service) => !existingItemIds.some((item) => item.itemType === 'service' && item.itemId === service.id)
  );

  // Reset form when modal opens/closes or type changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        itemType: selectedType,
        itemId: 0,
      });
      setError(null);
    }
  }, [isOpen, selectedType, form]);

  const onSubmit = async (values: ItemFormValues) => {
    setError(null);
    try {
      await addItem.mutateAsync({
        groupId,
        itemType: values.itemType,
        itemId: values.itemId,
      });
      
      // Reset form after successful submission
      form.reset({
        itemType: selectedType,
        itemId: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add item to group');
    }
  };

  const isLoading = addItem.isPending;
  const currentItems = selectedType === 'server' ? availableServers : availableServices;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item to Group">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">Item Type</span>
            <select
              className="form-select flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as 'server' | 'service');
                form.setValue('itemType', e.target.value as 'server' | 'service');
                form.setValue('itemId', 0);
              }}
            >
              <option value="server">Server</option>
              <option value="service">Service</option>
            </select>
          </label>
        </div>

        <div>
          <label className="flex flex-col">
            <span className="text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
              {selectedType === 'server' ? 'Server' : 'Service'}
            </span>
            <select
              className="form-select flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 px-4 text-sm text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
              {...form.register('itemId', { valueAsNumber: true })}
            >
              <option value="0">Select {selectedType === 'server' ? 'a server' : 'a service'}...</option>
              {currentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {selectedType === 'service' && ` (Port: ${(item as Service).port})`}
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.itemId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.itemId.message}</p>
          )}
          {currentItems.length === 0 && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No available {selectedType === 'server' ? 'servers' : 'services'} to add
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/50">
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
            disabled={isLoading || currentItems.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

