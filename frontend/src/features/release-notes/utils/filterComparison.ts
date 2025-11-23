/**
 * Filter comparison utilities
 * Used to detect if filters have been modified from a saved preset
 */

import type { Filter } from '../types/filters';

/**
 * Deep comparison of two filter objects
 */
export function areFiltersEqual(filter1?: Filter, filter2?: Filter): boolean {
  // Both undefined/null
  if (!filter1 && !filter2) return true;
  
  // One is undefined/null, other is not
  if (!filter1 || !filter2) return false;

  // Serialize both to JSON for comparison (handles nested structures)
  try {
    const json1 = JSON.stringify(normalizeFilter(filter1));
    const json2 = JSON.stringify(normalizeFilter(filter2));
    return json1 === json2;
  } catch (error) {
    console.error('Error comparing filters:', error);
    return false;
  }
}

/**
 * Normalize filter for comparison (remove undefined values, sort arrays, etc.)
 */
function normalizeFilter(filter: Filter): any {
  if ('key' in filter) {
    // It's a FilterCondition
    const normalized: any = {
      key: filter.key,
      type: filter.type,
      operator: filter.operator,
    };
    
    if (filter.value !== undefined && filter.value !== null) {
      normalized.value = Array.isArray(filter.value) 
        ? [...filter.value].sort() 
        : filter.value;
    }
    
    if (filter.caseSensitive !== undefined) {
      normalized.caseSensitive = filter.caseSensitive;
    }
    
    return normalized;
  }
  
  // It's a FilterGroup
  const normalized: any = {
    condition: filter.condition,
    childs: filter.childs
      .map(child => normalizeFilter(child))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };
  
  return normalized;
}

