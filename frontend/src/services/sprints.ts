import { apiFetch } from './apiClient';
import type { Task } from './tasks';

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  tasks?: Task[];
  metrics?: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalPoints: number;
    completedPoints: number;
  };
}

export async function getSprint(id: number): Promise<Sprint> {
  return apiFetch(`/sprints/${id}`);
}

export async function listSprints(params: {
  status?: SprintStatus[];
  limit?: number;
}): Promise<{ data: Sprint[] }> {
  return apiFetch('/sprints/list', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function createSprint(data: Partial<Sprint>): Promise<Sprint> {
  return apiFetch('/sprints', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSprint(id: number, data: Partial<Sprint>): Promise<Sprint> {
  return apiFetch(`/sprints/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSprint(id: number): Promise<void> {
  return apiFetch(`/sprints/${id}`, {
    method: 'DELETE',
  });
}

export async function addTasksToSprint(sprintId: number, taskIds: number[]): Promise<void> {
  return apiFetch(`/sprints/${sprintId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ taskIds }),
  });
}

export async function removeTaskFromSprint(sprintId: number, taskId: number): Promise<void> {
  return apiFetch(`/sprints/${sprintId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function completeSprint(sprintId: number, moveIncompleteToSprintId?: number | null): Promise<{ sprint: Sprint; movedTasksCount: number }> {
  return apiFetch<{ sprint: Sprint; movedTasksCount: number }>(`/sprints/${sprintId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ moveIncompleteToSprintId }),
  });
}

export async function cancelSprint(sprintId: number, moveTasksToSprintId?: number | null): Promise<{ success: boolean; movedTasksCount: number }> {
  return apiFetch<{ success: boolean; movedTasksCount: number }>(`/sprints/${sprintId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ moveTasksToSprintId }),
  });
}

export async function getBurndownData(sprintId: number): Promise<any> {
  return apiFetch(`/sprints/${sprintId}/burndown`);
}

export async function getGanttData(sprintId: number): Promise<any> {
  return apiFetch(`/sprints/${sprintId}/gantt`);
}
