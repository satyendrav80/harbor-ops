import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDomain, updateDomain, deleteDomain, getDomains } from '../../../services/domains';
import type { Domain } from '../../../services/domains';

export function useCreateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Domain, 'id' | 'createdAt' | 'updatedAt'>) => createDomain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Domain, 'id' | 'createdAt' | 'updatedAt'>> }) =>
      updateDomain(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

