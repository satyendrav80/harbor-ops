import { useQuery } from '@tanstack/react-query';
import { getSprint, listSprints, getBurndownData, getGanttData } from '../../../services/sprints';
import type { SprintStatus } from '../../../services/sprints';

export function useSprint(id: number) {
  return useQuery({
    queryKey: ['sprint', id],
    queryFn: () => getSprint(id),
    enabled: !!id,
  });
}

export function useSprints(filters?: {
  status?: SprintStatus[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['sprints', filters],
    queryFn: () => listSprints(filters || {}),
  });
}

export function useBurndownData(id: number) {
  return useQuery({
    queryKey: ['sprint', id, 'burndown'],
    queryFn: () => getBurndownData(id),
    enabled: !!id,
  });
}

export function useGanttData(id: number) {
  return useQuery({
    queryKey: ['sprint', id, 'gantt'],
    queryFn: () => getGanttData(id),
    enabled: !!id,
  });
}
