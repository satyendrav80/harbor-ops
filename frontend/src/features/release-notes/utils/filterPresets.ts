/**
 * Filter presets management utilities
 * Saves and loads filter configurations from localStorage
 */

import type { Filter } from '../types/filters';

const PRESETS_STORAGE_KEY = 'release-notes-filter-presets';

export type FilterPreset = {
  id: string;
  name: string;
  filters: Filter | undefined;
  createdAt: string;
  updatedAt: string;
};

/**
 * Get all saved filter presets
 */
export function getFilterPresets(): FilterPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load filter presets:', error);
    return [];
  }
}

/**
 * Save a filter preset
 */
export function saveFilterPreset(preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>): FilterPreset {
  const presets = getFilterPresets();
  const newPreset: FilterPreset = {
    ...preset,
    id: `preset-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  presets.push(newPreset);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return newPreset;
}

/**
 * Update an existing filter preset
 */
export function updateFilterPreset(id: string, updates: Partial<Omit<FilterPreset, 'id' | 'createdAt'>>): FilterPreset | null {
  const presets = getFilterPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) return null;

  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return presets[index];
}

/**
 * Delete a filter preset
 */
export function deleteFilterPreset(id: string): boolean {
  const presets = getFilterPresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Load a filter preset by ID
 */
export function loadFilterPreset(id: string): FilterPreset | null {
  const presets = getFilterPresets();
  return presets.find((p) => p.id === id) || null;
}

