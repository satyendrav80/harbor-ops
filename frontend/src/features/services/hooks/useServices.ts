import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getServices, getService, type ServicesResponse } from '../../../services/services';
import { apiFetch } from '../../../services/apiClient';

export function useServices(search: string = '', limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['services', search, limit],
    queryFn: async ({ pageParam = 1 }) => {
      return apiFetch<ServicesResponse>(
        `/services?page=${pageParam}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}&include=relations`
      );
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    structuralSharing: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Keep previous data during refetches to prevent flicker
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: ['service', id],
    queryFn: () => getService(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

