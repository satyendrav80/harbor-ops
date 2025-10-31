import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/apiClient';
import type { CredentialsResponse } from '../../../services/credentials';

export function useCredentials(search?: string, limit: number = 20, serverId?: number, serviceId?: number) {
  return useInfiniteQuery<CredentialsResponse, Error>({
    queryKey: ['credentials', search, serverId, serviceId],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      params.append('limit', limit.toString());
      if (search) {
        params.append('search', search);
      }
      if (serverId) {
        params.append('serverId', serverId.toString());
      }
      if (serviceId) {
        params.append('serviceId', serviceId.toString());
      }
      return apiFetch<CredentialsResponse>(`/credentials?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}
