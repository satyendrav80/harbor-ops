import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createReleaseNote, 
  updateReleaseNote, 
  markReleaseNoteDeployed,
  markReleaseNoteDeploymentStarted,
  deleteReleaseNote,
} from '../../../services/releaseNotes';
import toast from 'react-hot-toast';

export function useCreateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, note, publishDate, taskIds }: { serviceId: number; note: string; publishDate?: string; taskIds?: number[] }) =>
      createReleaseNote(serviceId, note, publishDate, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      toast.success('Release note created successfully');
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const invalidTasks = errorData.invalidTasks || [];
      
      if (invalidTasks.length > 0) {
        const taskList = invalidTasks
          .map((task: any) => `Task #${task.id} (${task.status === 'not_found' ? 'not found' : task.status})`)
          .join(', ');
        toast.error(
          `Cannot add tasks: Only tasks with status "completed" or "testing" can be added. Invalid tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        toast.error(errorData.message || error?.message || 'Failed to create release note');
      }
    },
  });
}

export function useUpdateReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, publishDate, serviceId, taskIds }: { id: number; note?: string; publishDate?: string; serviceId?: number; taskIds?: number[] }) =>
      updateReleaseNote(id, note, publishDate, serviceId, taskIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', variables.id] });
      toast.success('Release note updated successfully');
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const invalidTasks = errorData.invalidTasks || [];
      
      if (invalidTasks.length > 0) {
        const taskList = invalidTasks
          .map((task: any) => `Task #${task.id} (${task.status === 'not_found' ? 'not found' : task.status})`)
          .join(', ');
        toast.error(
          `Cannot update tasks: Only tasks with status "completed" or "testing" can be added. Invalid tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        toast.error(errorData.message || error?.message || 'Failed to update release note');
      }
    },
  });
}

export function useMarkReleaseNoteDeployed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeployed(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', id] });
      toast.success('Release note marked as deployed');
    },
    onError: (error: any) => {
      // Try multiple ways to access error data
      const errorData = error?.data || error?.response?.data || error || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        toast.error(
          `Cannot deploy: All tasks must be completed. Incomplete tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        // Show the backend message if available, otherwise show generic error
        const errorMessage = errorData.message || error?.message || 'Failed to mark release note as deployed';
        toast.error(errorMessage, { duration: 5000 });
      }
    },
  });
}

export function useMarkReleaseNoteDeploymentStarted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeploymentStarted(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', id] });
      toast.success('Deployment started');
    },
    onError: (error: any) => {
      // Try multiple ways to access error data
      const errorData = error?.data || error?.response?.data || error || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        toast.error(
          `Cannot start deployment: All tasks must be completed. Incomplete tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        // Show the backend message if available, otherwise show generic error
        const errorMessage = errorData.message || error?.message || 'Failed to start deployment';
        toast.error(errorMessage, { duration: 5000 });
      }
    },
  });
}

export function useDeleteReleaseNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReleaseNote(id),
    onSuccess: (data, id) => {
      // Remove the specific item from cache to prevent further queries
      queryClient.removeQueries({ queryKey: ['release-note', id] });
      // Invalidate the list to refresh it
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
      // Execute all operations sequentially to show individual errors
      const errors: Array<{ id: number; error: any }> = [];
      for (const id of ids) {
        try {
          await markReleaseNoteDeploymentStarted(id);
        } catch (error: any) {
          errors.push({ id, error });
        }
      }
      if (errors.length > 0) {
        // Throw the first error to trigger onError handler
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      toast.success('Deployment started for selected release notes');
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        toast.error(
          `Cannot start deployment: All tasks must be completed. Incomplete tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        toast.error(errorData.message || error?.message || 'Failed to start deployment for some release notes');
      }
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
      // Execute all operations sequentially to show individual errors
      const errors: Array<{ id: number; error: any }> = [];
      for (const id of ids) {
        try {
          await markReleaseNoteDeployed(id);
        } catch (error: any) {
          errors.push({ id, error });
        }
      }
      if (errors.length > 0) {
        // Throw the first error to trigger onError handler
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      toast.success('Selected release notes marked as deployed');
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        toast.error(
          `Cannot deploy: All tasks must be completed. Incomplete tasks: ${taskList}`,
          { duration: 8000 }
        );
      } else {
        toast.error(errorData.message || error?.message || 'Failed to deploy some release notes');
      }
    },
  });
}

