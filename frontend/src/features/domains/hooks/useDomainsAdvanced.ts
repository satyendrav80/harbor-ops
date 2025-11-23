/**
 * Hook for advanced filtering of domains
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listDomainsAdvanced, DomainsResponse } from '../../../services/domains';
import type { AdvancedFilterRequest } from '../../release-notes/types/filters';

export function useDomainsAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<DomainsResponse, Error>({
    queryKey: ['domains', 'advanced', request.filters, request.search, request.orderBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listDomainsAdvanced({
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

