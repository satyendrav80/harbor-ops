import { useQuery } from '@tanstack/react-query';
import { getPermissions } from '../../../services/users';

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

