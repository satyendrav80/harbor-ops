import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createReleaseNote, 
  updateReleaseNote, 
  markReleaseNoteDeployed,
  markReleaseNoteDeploymentStarted,
  deleteReleaseNote,
} from '../../../services/releaseNotes';

export function useCreateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, note, publishDate }: { serviceId: number; note: string; publishDate?: string }) =>
      createReleaseNote(serviceId, note, publishDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useUpdateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, publishDate }: { id: number; note?: string; publishDate?: string }) =>
      updateReleaseNote(id, note, publishDate),
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

export function useMarkReleaseNoteDeploymentStarted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeploymentStarted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useDeleteReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReleaseNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

