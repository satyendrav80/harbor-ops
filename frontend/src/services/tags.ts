import { apiFetch } from './apiClient';

export type Tag = {
  id: number;
  name: string;
  createdAt: string;
};

/**
 * Fetch all tags
 */
export async function getTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>('/tags');
}

/**
 * Create a new tag
 */
export async function createTag(data: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag> {
  return apiFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a tag
 */
export async function deleteTag(id: number): Promise<void> {
  return apiFetch<void>(`/tags/${id}`, {
    method: 'DELETE',
  });
}

