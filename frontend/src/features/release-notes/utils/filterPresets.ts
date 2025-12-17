/**
 * Filter presets management utilities
 * Saves and loads filter configurations from the database
 * Each page has its own separate presets
 */

import type { Filter, OrderByItem, GroupByItem } from '../types/filters';
import * as filterPresetsApi from '../../../services/filterPresets';
import type { FilterPreset as ApiFilterPreset } from '../../../services/filterPresets';

// Module-level request deduplication cache
// This prevents duplicate API calls even when components mount/unmount or React StrictMode double-invokes
const pendingRequests = new Map<string, Promise<FilterPreset[]>>();

// Convert API FilterPreset to local format for compatibility
export type FilterPreset = {
  id: string;
  name: string;
  filters: Filter | undefined;
  orderBy: OrderByItem[] | undefined;
  groupBy: GroupByItem[] | undefined;
  createdAt: string;
  updatedAt: string;
};

function convertApiPresetToLocal(apiPreset: ApiFilterPreset): FilterPreset {
  return {
    id: String(apiPreset.id),
    name: apiPreset.name,
    filters: (apiPreset.filters === null || apiPreset.filters === undefined) ? undefined : (apiPreset.filters as Filter),
    orderBy: (apiPreset.orderBy === null || apiPreset.orderBy === undefined) ? undefined : (apiPreset.orderBy as OrderByItem[]),
    groupBy: (apiPreset.groupBy === null || apiPreset.groupBy === undefined) ? undefined : (apiPreset.groupBy as GroupByItem[]),
    createdAt: apiPreset.createdAt,
    updatedAt: apiPreset.updatedAt,
  };
}

/**
 * Get all saved filter presets for a specific page
 * Uses request deduplication to prevent duplicate API calls
 * @param pageId - The page ID to load presets for
 * @param signal - Optional AbortSignal to cancel the request
 */
export async function getFilterPresets(pageId: string, signal?: AbortSignal): Promise<FilterPreset[]> {
  // Check if there's already a pending request for this pageId
  const existingRequest = pendingRequests.get(pageId);
  if (existingRequest) {
    // If signal is aborted, don't return the cached promise
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    // Return the existing promise (deduplication)
    try {
      return await existingRequest;
    } catch (error) {
      // If the cached request failed, remove it and retry
      pendingRequests.delete(pageId);
      // Re-throw to let caller handle it
      throw error;
    }
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      const apiPresets = await filterPresetsApi.getFilterPresets(pageId, signal);
      // Check if request was aborted
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const result = apiPresets.map(convertApiPresetToLocal);
      // Remove from cache after successful completion
      // Use setTimeout to allow other concurrent calls to use the same promise
      setTimeout(() => {
        pendingRequests.delete(pageId);
      }, 0);
      return result;
    } catch (error) {
      // Remove from cache on error
      pendingRequests.delete(pageId);
      // Ignore abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      console.error('Failed to load filter presets:', error);
      return [];
    }
  })();

  // Cache the request promise
  pendingRequests.set(pageId, requestPromise);

  return requestPromise;
}

/**
 * Save a filter preset for a specific page
 */
export async function saveFilterPreset(pageId: string, preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilterPreset> {
  try {
    const apiPreset = await filterPresetsApi.createFilterPreset({
      pageId,
      name: preset.name,
      filters: preset.filters,
      orderBy: preset.orderBy,
      groupBy: preset.groupBy,
      isShared: false,
    });
    return convertApiPresetToLocal(apiPreset);
  } catch (error) {
    console.error('Failed to save filter preset:', error);
    throw error;
  }
}

/**
 * Update an existing filter preset for a specific page
 */
export async function updateFilterPreset(
  pageId: string,
  id: string,
  updates: Partial<Omit<FilterPreset, 'id' | 'createdAt' | 'filters' | 'orderBy' | 'groupBy'>> & {
    filters?: Filter | null;
    orderBy?: OrderByItem[] | null;
    groupBy?: GroupByItem[] | null;
  }
): Promise<FilterPreset | null> {
  try {
    const presetId = parseInt(id);
    if (isNaN(presetId)) {
      console.error('Invalid preset ID:', id);
      return null;
    }

    const updateData: any = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    // Allow null to be explicitly sent to clear fields
    if (updates.filters !== undefined) {
      updateData.filters = updates.filters;
    }
    if (updates.orderBy !== undefined) {
      updateData.orderBy = updates.orderBy;
    }
    if (updates.groupBy !== undefined) {
      updateData.groupBy = updates.groupBy;
    }

    const apiPreset = await filterPresetsApi.updateFilterPreset(presetId, updateData);
    return convertApiPresetToLocal(apiPreset);
  } catch (error) {
    console.error('Failed to update filter preset:', error);
    return null;
  }
}

/**
 * Delete a filter preset for a specific page
 */
export async function deleteFilterPreset(pageId: string, id: string): Promise<boolean> {
  try {
    const presetId = parseInt(id);
    if (isNaN(presetId)) {
      console.error('Invalid preset ID:', id);
      return false;
    }

    await filterPresetsApi.deleteFilterPreset(presetId);
    return true;
  } catch (error) {
    console.error('Failed to delete filter preset:', error);
    return false;
  }
}

/**
 * Load a filter preset by ID for a specific page
 */
export async function loadFilterPreset(pageId: string, id: string): Promise<FilterPreset | null> {
  try {
    const presets = await getFilterPresets(pageId);
    return presets.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('Failed to load filter preset:', error);
    return null;
  }
}

