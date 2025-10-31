import { useInfiniteQuery } from '@tanstack/react-query';
import { getTags, TagsResponse } from '../../../services/tags';

export function useTags(search?: string, limit: number = 20) {
  return useInfiniteQuery<TagsResponse, Error>({
    queryKey: ['tags', search],
    queryFn: async ({ pageParam = 1 }) => {
      return getTags(pageParam as number, limit, search);
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

