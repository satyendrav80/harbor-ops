/**
 * Hook for advanced filtering of credentials
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listCredentialsAdvanced, CredentialsResponse } from '../../../services/credentials';
import type { AdvancedFilterRequest } from '../../release-notes/types/filters';

export function useCredentialsAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<CredentialsResponse, Error>({
    queryKey: ['credentials', 'advanced', request.filters, request.search, request.orderBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listCredentialsAdvanced({
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

