import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getTask, listTasks, type TasksResponse } from '../../../services/tasks';
import type { TaskStatus, TaskType, TaskPriority } from '../../../services/tasks';

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id),
    enabled: !!id,
  });
}

export function useTasks(filters?: {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  testerId?: string[];
  sprintId?: number | null;
  createdBy?: string[];
  parentTaskId?: number | null;
  reopenCountMin?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actionableFor?: string;
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => listTasks(filters || {}),
  });
}

export function useInfiniteTasks(filters?: {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  testerId?: string[];
  sprintId?: number | null;
  createdBy?: string[];
  parentTaskId?: number | null;
  reopenCountMin?: number;
  search?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actionableFor?: string;
}) {
  const limit = filters?.limit || 50;
  return useInfiniteQuery<TasksResponse>({
    queryKey: ['tasks', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) =>
      listTasks({
        ...(filters || {}),
        page: pageParam as number,
        limit,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}
