import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createReleaseNote, 
  updateReleaseNote, 
  markReleaseNoteDeployed,
  markReleaseNoteDeploymentStarted,
  deleteReleaseNote,
} from '../../../services/releaseNotes';
import toast from 'react-hot-toast';
import { useMutationFeedback, type MutationFeedbackConfig } from '../../../hooks/useMutationFeedback';

export function useCreateReleaseNote(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to create release note',
    successMessage: 'Release note created successfully',
  });
  return useMutation({
    mutationFn: ({ serviceId, note, publishDate, taskIds }: { serviceId: number; note: string; publishDate?: string; taskIds?: number[] }) =>
      createReleaseNote(serviceId, note, publishDate, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      handleSuccess();
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const invalidTasks = errorData.invalidTasks || [];
      
      if (invalidTasks.length > 0) {
        const taskList = invalidTasks
          .map((task: any) => `Task #${task.id} (${task.status === 'not_found' ? 'not found' : task.status})`)
          .join(', ');
        const message = `Cannot add tasks: Only tasks with status "completed" or "testing" can be added. Invalid tasks: ${taskList}`;
        handleError(message);
      } else {
        handleError(errorData.message || error?.message || 'Failed to create release note');
      }
    },
  });
}

export function useUpdateReleaseNote(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to update release note',
    successMessage: 'Release note updated successfully',
  });
  return useMutation({
    mutationFn: ({ id, note, publishDate, serviceId, taskIds }: { id: number; note?: string; publishDate?: string; serviceId?: number; taskIds?: number[] }) =>
      updateReleaseNote(id, note, publishDate, serviceId, taskIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', variables.id] });
      handleSuccess();
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      const invalidTasks = errorData.invalidTasks || [];
      
      if (invalidTasks.length > 0) {
        const taskList = invalidTasks
          .map((task: any) => `Task #${task.id} (${task.status === 'not_found' ? 'not found' : task.status})`)
          .join(', ');
        const message = `Cannot update tasks: Only tasks with status "completed" or "testing" can be added. Invalid tasks: ${taskList}`;
        handleError(message);
      } else {
        handleError(errorData.message || error?.message || 'Failed to update release note');
      }
    },
  });
}

export function useMarkReleaseNoteDeployed(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to mark release note as deployed',
    successMessage: 'Release note marked as deployed',
  });
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeployed(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', id] });
      handleSuccess();
    },
    onError: (error: any) => {
      // Try multiple ways to access error data
      const errorData = error?.data || error?.response?.data || error || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        const message = `Cannot deploy: All tasks must be completed. Incomplete tasks: ${taskList}`;
        handleError(message);
      } else {
        // Show the backend message if available, otherwise show generic error
        const errorMessage = errorData.message || error?.message || 'Failed to mark release note as deployed';
        handleError(errorMessage);
      }
    },
  });
}

export function useMarkReleaseNoteDeploymentStarted(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to start deployment',
    successMessage: 'Deployment started',
  });
  return useMutation({
    mutationFn: (id: number) => markReleaseNoteDeploymentStarted(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
      queryClient.invalidateQueries({ queryKey: ['release-note', id] });
      handleSuccess();
    },
    onError: (error: any) => {
      // Try multiple ways to access error data
      const errorData = error?.data || error?.response?.data || error || {};
      const incompleteTasks = errorData.incompleteTasks || [];
      
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks
          .map((task: any) => `"${task.title || `Task #${task.id}`}" (${task.status})`)
          .join(', ');
        const message = `Cannot start deployment: All tasks must be completed. Incomplete tasks: ${taskList}`;
        handleError(message);
      } else {
        // Show the backend message if available, otherwise show generic error
        const errorMessage = errorData.message || error?.message || 'Failed to start deployment';
        handleError(errorMessage);
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

