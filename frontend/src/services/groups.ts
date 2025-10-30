import { apiFetch } from './apiClient';

export type Group = {
  id: number;
  name: string;
  createdAt: string;
};

/**
 * Fetch all groups
 */
export async function getGroups(): Promise<Group[]> {
  return apiFetch<Group[]>('/groups');
}

/**
 * Create a new group
 */
export async function createGroup(data: Omit<Group, 'id' | 'createdAt'>): Promise<Group> {
  return apiFetch<Group>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a group
 */
export async function deleteGroup(id: number): Promise<void> {
  return apiFetch<void>(`/groups/${id}`, {
    method: 'DELETE',
  });
}

