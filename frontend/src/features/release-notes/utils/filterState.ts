/**
 * Filter state management utilities
 */

import type { Filter, FilterCondition, FilterGroup } from '../types/filters';

/**
 * Create a simple AND filter group from conditions
 */
export function createFilterGroup(conditions: FilterCondition[]): Filter {
  if (conditions.length === 0) {
    return { condition: 'and', childs: [] };
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return {
    condition: 'and',
    childs: conditions,
  };
}

/**
 * Create a filter condition
 */
export function createFilterCondition(
  key: string,
  type: string,
  operator: string,
  value: any
): FilterCondition {
  return {
    key,
    type: type as any,
    operator: operator as any,
    value,
  };
}

/**
 * Check if filter has any conditions
 */
export function hasActiveFilters(filter?: Filter): boolean {
  if (!filter) return false;
  
  if ('key' in filter) {
    // It's a FilterCondition
    return filter.operator !== 'isNull' && filter.operator !== 'isNotNull' 
      ? filter.value !== undefined && filter.value !== null && filter.value !== ''
      : true;
  }
  
  // It's a FilterGroup
  if (!filter.childs || filter.childs.length === 0) return false;
  return filter.childs.some(child => hasActiveFilters(child));
}

