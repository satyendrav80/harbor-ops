import { useQuery } from '@tanstack/react-query';
import { getTask, listTasks } from '../../../services/tasks';
import type { TaskStatus, TaskType, TaskPriority } from '../../../services/tasks';

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id),
    enabled: !!id,
  });
}

export function useTasks(filters?: {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  testerId?: string[];
  sprintId?: number | null;
  createdBy?: string[];
  parentTaskId?: number | null;
  reopenCountMin?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actionableFor?: string;
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => listTasks(filters || {}),
  });
}
