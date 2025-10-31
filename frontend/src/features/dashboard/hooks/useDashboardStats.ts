import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, type DashboardStats } from '../../../services/dashboard';

/**
 * React Query hook for fetching dashboard statistics
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
    staleTime: 30 * 1000, // 30 seconds - dashboard stats don't need to be super fresh
    structuralSharing: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

