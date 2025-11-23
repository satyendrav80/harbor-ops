/**
 * Hook for advanced filtering of services
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listServicesAdvanced, ServicesResponse } from '../../../services/services';
import type { AdvancedFilterRequest } from '../../release-notes/types/filters';

export function useServicesAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<ServicesResponse, Error>({
    queryKey: ['services', 'advanced', request.filters, request.search, request.orderBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listServicesAdvanced({
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

