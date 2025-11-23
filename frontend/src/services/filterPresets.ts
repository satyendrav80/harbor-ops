import { apiFetch } from './apiClient';
import type { Filter } from '../features/release-notes/types/filters';

export type FilterPreset = {
  id: number;
  userId: string;
  pageId: string;
  name: string;
  filters: Filter | null | undefined;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FilterPresetsResponse = {
  data: FilterPreset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Get all filter presets for the current user
 * @param pageId - Optional page ID to filter by
 * @param signal - Optional AbortSignal to cancel the request
 */
export async function getFilterPresets(pageId?: string, signal?: AbortSignal): Promise<FilterPreset[]> {
  const queryParams = pageId ? `?pageId=${encodeURIComponent(pageId)}` : '';
  const response = await apiFetch<FilterPresetsResponse>(`/filter-presets${queryParams}`, {
    signal,
  });
  return response.data;
}

/**
 * Create a new filter preset
 */
export async function createFilterPreset(data: {
  pageId: string;
  name: string;
  filters?: Filter;
  isShared?: boolean;
}): Promise<FilterPreset> {
  return apiFetch<FilterPreset>('/filter-presets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing filter preset
 */
export async function updateFilterPreset(
  id: number,
  data: {
    name?: string;
    filters?: Filter;
    isShared?: boolean;
  }
): Promise<FilterPreset> {
  return apiFetch<FilterPreset>(`/filter-presets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a filter preset
 */
export async function deleteFilterPreset(id: number): Promise<void> {
  await apiFetch(`/filter-presets/${id}`, {
    method: 'DELETE',
  });
}

