import { useQuery } from '@tanstack/react-query';
import { getRecentAlerts, type RecentAlert } from '../../../services/dashboard';

/**
 * React Query hook for fetching recent alerts
 */
export function useRecentAlerts() {
  return useQuery<RecentAlert[]>({
    queryKey: ['dashboard', 'recent-alerts'],
    queryFn: getRecentAlerts,
  });
}

