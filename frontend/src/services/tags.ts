import { apiFetch } from './apiClient';

export type Tag = {
  id: number;
  name: string;
  value: string | null;
  color: string | null;
  createdAt: string;
};

export type TagsResponse = {
  data: Tag[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all tags (paginated)
 */
export async function getTags(page: number = 1, limit: number = 20, search?: string): Promise<TagsResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (search) {
    params.append('search', search);
  }
  return apiFetch<TagsResponse>(`/tags?${params.toString()}`);
}

/**
 * Get a single tag by ID
 */
export async function getTag(id: number): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`);
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
 * Update a tag
 */
export async function updateTag(id: number, data: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`, {
    method: 'PUT',
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

