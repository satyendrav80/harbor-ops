import { useQuery, useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { getTask, listTasks, listTasksAdvanced, type TasksResponse } from '../../../services/tasks';
import type { TaskStatus, TaskType, TaskPriority, Task } from '../../../services/tasks';

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

/**
 * Fetch multiple tasks by their IDs
 * Uses advanced filtering to fetch tasks efficiently
 */
export function useTasksByIds(taskIds: number[]): { data: Task[] | undefined; isLoading: boolean } {
  const enabled = taskIds.length > 0;
  
  // For small sets (<= 20), fetch individually for better caching
  // For larger sets, use advanced filtering
  const useIndividual = taskIds.length <= 20;
  
  const individualQueries = useQueries({
    queries: useIndividual && enabled
      ? taskIds.map((id) => ({
          queryKey: ['task', id],
          queryFn: () => getTask(id),
          enabled: true,
        }))
      : [],
  });
  
  const advancedQuery = useQuery({
    queryKey: ['tasks', 'by-ids', taskIds.sort((a, b) => a - b)],
    queryFn: async () => {
      if (taskIds.length === 0) return { data: [], pagination: { page: 1, limit: taskIds.length, total: 0, totalPages: 0 } };
      
      // Use advanced filtering with OR condition for IDs
      const filters = {
        condition: 'or' as const,
        childs: taskIds.map((id) => ({
          key: 'id',
          operator: 'eq' as const,
          value: id,
        })),
      };
      
      return listTasksAdvanced({
        filters,
        limit: taskIds.length,
        page: 1,
      });
    },
    enabled: !useIndividual && enabled,
  });
  
  if (useIndividual) {
    const isLoading = individualQueries.some((q) => q.isLoading);
    const data = individualQueries
      .map((q) => q.data)
      .filter((task): task is Task => task !== undefined);
    return { data, isLoading };
  }
  
  return {
    data: advancedQuery.data?.data,
    isLoading: advancedQuery.isLoading,
  };
}
