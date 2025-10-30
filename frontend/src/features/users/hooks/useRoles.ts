import { useInfiniteQuery } from '@tanstack/react-query';
import { getRoles } from '../../../services/users';

export function useRoles(search: string = '') {
  return useInfiniteQuery({
    queryKey: ['roles', search],
    queryFn: ({ pageParam = 1 }) => getRoles(pageParam, 20, search),
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


