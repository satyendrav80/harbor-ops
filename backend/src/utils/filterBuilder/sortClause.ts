/**
 * Sort/OrderBy clause building utilities
 */

import type { OrderByItem } from '../../types/filterMetadata';

/**
 * Converts a dot-path key (e.g., "assignedToUser.name") to nested Prisma orderBy structure
 * @param key - Field key, may contain dots for relation fields
 * @param direction - Sort direction
 * @returns Nested Prisma orderBy object
 */
function buildNestedOrderBy(key: string, direction: 'asc' | 'desc'): any {
  const parts = key.split('.');
  
  if (parts.length === 1) {
    // Simple field, no relation
    return { [parts[0]]: direction };
  }
  
  // Relation field (e.g., "assignedToUser.name")
  // Build nested structure: { assignedToUser: { name: 'asc' } }
  let result: any = {};
  let current = result;
  
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {};
    current = current[parts[i]];
  }
  
  // Set the final field with direction
  current[parts[parts.length - 1]] = direction;
  
  return result;
}

/**
 * Builds a Prisma orderBy clause from sort parameters
 * Supports both single orderBy (legacy) and array of orderBy items (new structure)
 * Also supports dot-path keys for relation fields (e.g., "assignedToUser.name")
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
    return orderBy.map(item => buildNestedOrderBy(item.key, item.direction));
  }

  // Handle single orderBy object (legacy or new format)
  if (orderBy) {
    const field = orderBy.key || orderBy.field;
    if (field) {
      return buildNestedOrderBy(field, orderBy.direction || defaultDirection);
    }
  }

  // Default
  return {
    [defaultField]: defaultDirection,
  };
}

