/**
 * Hook for advanced filtering of release notes
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listReleaseNotesAdvanced, ReleaseNotesResponse } from '../../../services/releaseNotes';
import type { AdvancedFilterRequest } from '../types/filters';

export function useReleaseNotesAdvanced(
  request: AdvancedFilterRequest,
  limit: number = 20
) {
  return useInfiniteQuery<ReleaseNotesResponse, Error>({
    queryKey: ['release-notes', 'advanced', request.filters, request.search, request.orderBy, request.groupBy],
    queryFn: async ({ pageParam = 1 }) => {
      return listReleaseNotesAdvanced({
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

