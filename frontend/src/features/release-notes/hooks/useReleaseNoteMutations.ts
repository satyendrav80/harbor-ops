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
    mutationFn: ({ id, note, publishDate, serviceId }: { id: number; note?: string; publishDate?: string; serviceId?: number }) =>
      updateReleaseNote(id, note, publishDate, serviceId),
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

/**
 * Bulk delete release notes
 */
export function useBulkDeleteReleaseNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Execute all deletions in parallel
      await Promise.all(ids.map(id => deleteReleaseNote(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

/**
 * Bulk mark release notes as deployment started
 */
export function useBulkMarkReleaseNotesDeploymentStarted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Execute all operations in parallel
      await Promise.all(ids.map(id => markReleaseNoteDeploymentStarted(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

/**
 * Bulk mark release notes as deployed
 */
export function useBulkMarkReleaseNotesDeployed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Execute all operations in parallel
      await Promise.all(ids.map(id => markReleaseNoteDeployed(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

