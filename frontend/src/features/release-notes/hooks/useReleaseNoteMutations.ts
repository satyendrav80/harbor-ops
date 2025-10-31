import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReleaseNote, updateReleaseNote, markReleaseNoteDeployed } from '../../../services/releaseNotes';

export function useCreateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, note }: { serviceId: number; note: string }) =>
      createReleaseNote(serviceId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useUpdateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => updateReleaseNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useMarkReleaseNoteDeployed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeployed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

