import { useQuery } from '@tanstack/react-query';
import { getServiceHealth, type ServiceHealth } from '../../../services/dashboard';

/**
 * React Query hook for fetching service health status
 */
export function useServiceHealth() {
  return useQuery<ServiceHealth[]>({
    queryKey: ['dashboard', 'service-health'],
    queryFn: getServiceHealth,
    staleTime: 30 * 1000, // 30 seconds
    structuralSharing: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

