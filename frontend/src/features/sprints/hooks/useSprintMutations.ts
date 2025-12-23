import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSprint,
  updateSprint,
  deleteSprint,
  addTasksToSprint,
  removeTaskFromSprint,
} from '../../../services/sprints';
import type { Sprint, SprintStatus } from '../../../services/sprints';
import { useMutationFeedback, type MutationFeedbackConfig } from '../../../hooks/useMutationFeedback';

export function useCreateSprint(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to create sprint',
    successMessage: 'Sprint created successfully',
  });
  return useMutation<Sprint, Error, any>({
    mutationFn: createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      handleSuccess();
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

export function useUpdateSprint(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to update sprint',
    successMessage: 'Sprint updated successfully',
  });
  return useMutation<Sprint, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => updateSprint(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.id] });
      handleSuccess();
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

export function useDeleteSprint(feedback?: MutationFeedbackConfig) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useMutationFeedback(feedback, {
    fallbackErrorMessage: 'Failed to delete sprint',
    successMessage: 'Sprint deleted successfully',
  });
  return useMutation<void, Error, number>({
    mutationFn: deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      handleSuccess();
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

export function useAddTasksToSprint() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; taskIds: number[] }>({
    mutationFn: ({ id, taskIds }) => addTasksToSprint(id, taskIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tasks added to sprint');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add tasks');
    },
  });
}

export function useRemoveTaskFromSprint() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; taskId: number }>({
    mutationFn: ({ id, taskId }) => removeTaskFromSprint(id, taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task removed from sprint');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove task');
    },
  });
}
