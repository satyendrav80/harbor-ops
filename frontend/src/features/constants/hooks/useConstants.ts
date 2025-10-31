import { useQuery } from '@tanstack/react-query';
import { getConstants } from '../../../services/constants';

/**
 * Hook to fetch and use constants from the backend
 */
export function useConstants() {
  return useQuery({
    queryKey: ['constants'],
    queryFn: getConstants,
    staleTime: Infinity, // Constants rarely change, so cache indefinitely
    gcTime: Infinity, // Keep in cache forever
  });
}

