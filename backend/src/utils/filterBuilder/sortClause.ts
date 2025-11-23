/**
 * Sort/OrderBy clause building utilities
 */

import type { OrderByItem } from '../../types/filterMetadata';

/**
 * Builds a Prisma orderBy clause from sort parameters
 * Supports both single orderBy (legacy) and array of orderBy items (new structure)
 * 
 * @param orderBy - Sort configuration(s) - can be single item or array
 * @param defaultField - Default field to sort by if orderBy is not provided
 * @param defaultDirection - Default direction (asc/desc) if orderBy is not provided
 * @returns Prisma orderBy clause (single object or array for multiple sorts)
 */
export function buildSortClause(
  orderBy?: { field?: string; key?: string; direction?: 'asc' | 'desc' } | OrderByItem[],
  defaultField: string = 'createdAt',
  defaultDirection: 'asc' | 'desc' = 'desc'
): any {
  // Handle array of orderBy items (new structure)
  if (Array.isArray(orderBy)) {
    if (orderBy.length === 0) {
      return { [defaultField]: defaultDirection };
    }

    // Prisma supports array of orderBy for multiple sorts
    return orderBy.map(item => ({
      [item.key]: item.direction,
    }));
  }

  // Handle single orderBy object (legacy or new format)
  if (orderBy) {
    const field = orderBy.key || orderBy.field;
    if (field) {
      return {
        [field]: orderBy.direction || defaultDirection,
      };
    }
  }

  // Default
  return {
    [defaultField]: defaultDirection,
  };
}

