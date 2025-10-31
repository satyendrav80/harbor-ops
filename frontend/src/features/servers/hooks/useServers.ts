import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getServers, getServer, type ServersResponse } from '../../../services/servers';
import { apiFetch } from '../../../services/apiClient';

export function useServers(search: string = '', limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['servers', search, limit],
    queryFn: async ({ pageParam = 1 }) => {
      return apiFetch<ServersResponse>(
        `/servers?page=${pageParam}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
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
  });
}

export function useServer(id: number) {
  return useQuery({
    queryKey: ['server', id],
    queryFn: () => getServer(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

