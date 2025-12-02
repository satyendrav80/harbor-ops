import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCredential, updateCredential, deleteCredential } from '../../../services/credentials';
import type { Credential } from '../../../services/credentials';

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation<Credential, Error, Omit<Credential, 'id' | 'createdAt'> & { tagIds?: number[] }>({
    mutationFn: createCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useUpdateCredential() {
  const queryClient = useQueryClient();
  return useMutation<Credential, Error, { id: number; data: Partial<Omit<Credential, 'id' | 'createdAt'>> & { tagIds?: number[] } }>({
    mutationFn: ({ id, data }) => updateCredential(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}
