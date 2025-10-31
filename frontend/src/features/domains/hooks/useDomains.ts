import { useInfiniteQuery } from '@tanstack/react-query';
import { getDomains, type DomainsResponse } from '../../../services/domains';

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
  });
}

