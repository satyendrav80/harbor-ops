import { useQuery } from '@tanstack/react-query';
import { getGroups, getGroup, GroupsResponse } from '../../../services/groups';

/**
 * React Query hook for fetching groups with pagination and search
 */
export function useGroups(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery<GroupsResponse>({
    queryKey: ['groups', params],
    queryFn: () => getGroups(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * React Query hook for fetching a single group with full item details
 */
export function useGroup(id: number) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => getGroup(id),
    enabled: !!id && !isNaN(id),
    staleTime: 30 * 1000, // 30 seconds
  });
}

