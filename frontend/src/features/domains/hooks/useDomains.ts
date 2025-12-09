import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getDomains, getDomain, type DomainsResponse } from '../../../services/domains';

export function useDomains(search: string = '', limit: number = 20) {
  return useInfiniteQuery<DomainsResponse, Error>({
    queryKey: ['domains', search],
    queryFn: async ({ pageParam = 1 }) => {
      return getDomains(pageParam as number, limit, search);
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

export function useDomain(id: number) {
  return useQuery({
    queryKey: ['domain', id],
    queryFn: () => getDomain(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

