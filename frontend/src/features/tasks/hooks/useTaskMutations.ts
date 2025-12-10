import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  reopenTask,
  addDependency,
  removeDependency,
  createSubtask,
  createComment,
  updateComment,
  deleteComment,
  addReaction,
  removeReaction,
} from '../../../services/tasks';
import type { Task, TaskComment, TaskStatus } from '../../../services/tasks';
import toast from 'react-hot-toast';

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, any>({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, { id: number; status: TaskStatus; testingSkipped?: boolean; testingSkipReason?: string; attentionToId?: string | null; statusReason?: string; testerId?: string | null }>({
    mutationFn: ({ id, status, testingSkipped, testingSkipReason, attentionToId, statusReason, testerId }) =>
      updateTaskStatus(id, { status, testingSkipped, testingSkipReason, attentionToId, statusReason, testerId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Task status updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, { id: number; reason: string }>({
    mutationFn: ({ id, reason }) => reopenTask(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Task reopened');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reopen task');
    },
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: number; blockedByTaskId: number }>({
    mutationFn: ({ id, blockedByTaskId }) => addDependency(id, blockedByTaskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Dependency added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add dependency');
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; dependencyId: number }>({
    mutationFn: ({ id, dependencyId }) => removeDependency(id, dependencyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Dependency removed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove dependency');
    },
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, { parentId: number; data: any }>({
    mutationFn: ({ parentId, data }) => createSubtask(parentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create subtask');
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation<TaskComment, Error, { taskId: number; content: string; parentId?: number }>({
    mutationFn: ({ taskId, content, parentId }) => createComment(taskId, { content, parentId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      toast.success('Comment added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation<TaskComment, Error, { taskId: number; commentId: number; content: string }>({
    mutationFn: ({ taskId, commentId, content }) => updateComment(taskId, commentId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      toast.success('Comment updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: number; commentId: number }>({
    mutationFn: ({ taskId, commentId }) => deleteComment(taskId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { taskId: number; commentId: number; emoji: string }>({
    mutationFn: ({ taskId, commentId, emoji }) => addReaction(taskId, commentId, emoji),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add reaction');
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: number; commentId: number; emoji: string }>({
    mutationFn: ({ taskId, commentId, emoji }) => removeReaction(taskId, commentId, emoji),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove reaction');
    },
  });
}
