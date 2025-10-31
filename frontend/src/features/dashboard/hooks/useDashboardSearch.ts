import { useQuery } from '@tanstack/react-query';
import { searchDashboard, type SearchResults } from '../../../services/dashboard';
import { useDebounce } from '../../../hooks/useDebounce';

/**
 * React Query hook for searching dashboard items
 */
export function useDashboardSearch(query: string) {
  const debouncedQuery = useDebounce(query, 500);

  return useQuery<SearchResults>({
    queryKey: ['dashboard', 'search', debouncedQuery],
    queryFn: () => searchDashboard(debouncedQuery, 5),
    enabled: debouncedQuery.length >= 2, // Only search if query is at least 2 characters
    staleTime: 10 * 1000, // 10 seconds
    structuralSharing: true,
    refetchOnWindowFocus: false,
  });
}

