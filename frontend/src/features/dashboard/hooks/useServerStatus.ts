import { useQuery } from '@tanstack/react-query';
import { getServerStatus, type ServerStatus } from '../../../services/dashboard';

/**
 * React Query hook for fetching server status counts
 */
export function useServerStatus() {
  return useQuery<ServerStatus>({
    queryKey: ['dashboard', 'server-status'],
    queryFn: getServerStatus,
  });
}

