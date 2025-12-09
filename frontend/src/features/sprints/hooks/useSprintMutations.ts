import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSprint,
  updateSprint,
  deleteSprint,
  addTasksToSprint,
  removeTaskFromSprint,
} from '../../../services/sprints';
import type { Sprint, SprintStatus } from '../../../services/sprints';
import toast from 'react-hot-toast';

export function useCreateSprint() {
  const queryClient = useQueryClient();
  return useMutation<Sprint, Error, any>({
    mutationFn: createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create sprint');
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();
  return useMutation<Sprint, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => updateSprint(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.id] });
      toast.success('Sprint updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update sprint');
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete sprint');
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
