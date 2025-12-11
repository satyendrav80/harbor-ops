import { useInfiniteQuery } from '@tanstack/react-query';
import { listSprints, type Sprint, type SprintStatus, type SprintsResponse } from '../../../services/sprints';

export function useInfiniteSprints(filters?: {
  status?: SprintStatus[];
  search?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const limit = filters?.limit || 20;

  return useInfiniteQuery<SprintsResponse>({
    queryKey: ['sprints', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) =>
      listSprints({
        status: filters?.status,
        search: filters?.search,
        page: pageParam as number,
        limit,
        sortBy: filters?.sortBy,
        sortOrder: filters?.sortOrder,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 0,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

