/**
 * Hook for advanced filtering of servers
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listServersAdvanced, ServersResponse } from '../../../services/servers';
import type { AdvancedFilterRequest } from '../../release-notes/types/filters';

export function useServersAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<ServersResponse, Error>({
    queryKey: ['servers', 'advanced', request.filters, request.search, request.orderBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listServersAdvanced({
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

