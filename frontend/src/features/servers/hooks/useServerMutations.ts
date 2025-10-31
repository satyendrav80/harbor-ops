import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServer, updateServer, deleteServer, type Server } from '../../../services/servers';

export function useCreateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Server, 'id' | 'createdAt'>> }) => updateServer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', variables.id] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

