import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/apiClient';
import { getCredential } from '../../../services/credentials';
import type { CredentialsResponse } from '../../../services/credentials';

export function useCredentials(search?: string, limit: number = 20, serverId?: number, serviceId?: number, credentialId?: number) {
  return useInfiniteQuery<CredentialsResponse, Error>({
    queryKey: ['credentials', search, serverId, serviceId, credentialId],
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
      if (credentialId) {
        params.append('credentialId', credentialId.toString());
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
    structuralSharing: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Keep previous data during refetches to prevent flicker
  });
}

export function useCredential(id: number) {
  return useQuery({
    queryKey: ['credential', id],
    queryFn: () => getCredential(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
