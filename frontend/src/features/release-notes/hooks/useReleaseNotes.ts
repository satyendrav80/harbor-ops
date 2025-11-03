import { useInfiniteQuery } from '@tanstack/react-query';
import { getReleaseNotes, ReleaseNotesResponse } from '../../../services/releaseNotes';

export function useReleaseNotes(
  search?: string,
  status?: 'pending' | 'deployed' | 'deployment_started',
  limit: number = 20,
  serviceId?: number
) {
  return useInfiniteQuery<ReleaseNotesResponse, Error>({
    queryKey: ['release-notes', search, status, serviceId],
    queryFn: async ({ pageParam = 1 }) => {
      return getReleaseNotes(pageParam as number, limit, search, status, serviceId);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    structuralSharing: true, // Preserve object references when data hasn't changed
    refetchOnWindowFocus: false, // Prevent refetch on window focus to reduce flicker
    placeholderData: (previousData) => previousData, // Keep previous data during refetches to prevent flicker
  });
}

