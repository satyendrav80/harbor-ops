import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getServices, getService, type ServicesResponse } from '../../../services/services';
import { apiFetch } from '../../../services/apiClient';

export function useServices(search: string = '', limit: number = 20, serviceId?: number, serverId?: number) {
  return useInfiniteQuery({
    queryKey: ['services', search, limit, serviceId, serverId],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (serviceId) params.append('serviceId', serviceId.toString());
      if (serverId) params.append('serverId', serverId.toString());
      params.append('include', 'relations');
      return apiFetch<ServicesResponse>(`/services?${params.toString()}`);
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

