/**
 * Hook for advanced filtering of tasks
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listTasksAdvanced, TasksResponse } from '../../../services/tasks';
import type { AdvancedFilterRequest } from '../../release-notes/types/filters';

export function useTasksAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<TasksResponse, Error>({
    queryKey: ['tasks', 'advanced', request.filters, request.search, request.orderBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listTasksAdvanced({
        ...request,
        page: pageParam as number,
        limit,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    structuralSharing: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}
