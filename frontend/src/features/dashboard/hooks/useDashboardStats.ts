import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, type DashboardStats } from '../../../services/dashboard';

/**
 * React Query hook for fetching dashboard statistics
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  });
}

