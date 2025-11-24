/**
 * Group filter handling utilities
 * Groups are filtered through GroupItem, which requires special handling
 */

import { PrismaClient } from '@prisma/client';
import type { FilterOperator } from '../../types/filterMetadata';

const prisma = new PrismaClient();

/**
 * Extract group filters from a where clause and return the remaining clause
 */
export function extractGroupFilters(where: any): { groupFilters: any[]; remainingWhere: any } {
  const groupFilters: any[] = [];
  
  function extractRecursive(clause: any): any {
    // Handle primitives and Date objects (preserve them as-is)
    if (clause === null || clause === undefined) {
      return clause;
    }
    
    // Preserve Date objects and other non-object primitives
    if (clause instanceof Date || typeof clause !== 'object') {
      return clause;
    }
    
    // Check if this is a group filter marker
    if (clause.__groupFilter) {
      groupFilters.push(clause);
      return undefined; // Remove from clause
    }
    
    // Handle AND/OR arrays
    if (Array.isArray(clause)) {
      const filtered = clause.map(extractRecursive).filter(c => c !== undefined);
      return filtered.length > 0 ? filtered : undefined;
    }
    
    // Handle AND/OR objects
    if ('AND' in clause) {
      const filtered = extractRecursive(clause.AND);
      if (filtered === undefined) return undefined;
      return { AND: filtered };
    }
    
    if ('OR' in clause) {
      const filtered = extractRecursive(clause.OR);
      if (filtered === undefined) return undefined;
      return { OR: filtered };
    }
    
    if ('not' in clause) {
      const filtered = extractRecursive(clause.not);
      if (filtered === undefined) return undefined;
      return { not: filtered };
    }
    
    // Recursively process all properties
    const result: any = {};
    let hasProperties = false;
    
    for (const [key, value] of Object.entries(clause)) {
      // Preserve Date objects and primitives directly
      if (value instanceof Date || (value !== null && typeof value !== 'object')) {
        result[key] = value;
        hasProperties = true;
      } else {
        // Recursively process objects
        const processed = extractRecursive(value);
        if (processed !== undefined) {
          result[key] = processed;
          hasProperties = true;
        }
      }
    }
    
    return hasProperties ? result : undefined;
  }
  
  const remainingWhere = extractRecursive(where) || {};
  
  return { groupFilters, remainingWhere };
}

/**
 * Process group filters and get item IDs that match
 * @param groupFilters - Array of group filter objects
 * @param itemType - 'service', 'server', 'credential', or 'domain'
 * @returns Array of item IDs that match the group filters
 */
export async function processGroupFilters(
  groupFilters: any[],
  itemType: 'service' | 'server' | 'credential' | 'domain'
): Promise<number[]> {
  if (groupFilters.length === 0) {
    return [];
  }
  
  // Collect all group IDs/names from filters
  const groupIds: number[] = [];
  const groupNames: string[] = [];
  
  for (const filter of groupFilters) {
    if (filter.field === 'id') {
      if (filter.operator === 'eq') {
        groupIds.push(Number(filter.value));
      } else if (filter.operator === 'in' && Array.isArray(filter.value)) {
        groupIds.push(...filter.value.map((v: any) => Number(v)).filter((id: number) => !isNaN(id)));
      }
    } else if (filter.field === 'name') {
      if (filter.operator === 'eq') {
        groupNames.push(String(filter.value));
      } else if (filter.operator === 'in' && Array.isArray(filter.value)) {
        groupNames.push(...filter.value.map((v: any) => String(v)));
      } else if (filter.operator === 'contains') {
        // For contains, we'll need to fetch groups first
        const groups = await prisma.group.findMany({
          where: {
            deleted: false,
            name: { contains: String(filter.value), mode: 'insensitive' },
          },
          select: { id: true },
        });
        groupIds.push(...groups.map(g => g.id));
      }
    }
  }
  
  // Fetch groups by name if needed
  if (groupNames.length > 0) {
    const groups = await prisma.group.findMany({
      where: {
        deleted: false,
        name: { in: groupNames },
      },
      select: { id: true },
    });
    groupIds.push(...groups.map(g => g.id));
  }
  
  // Remove duplicates
  const uniqueGroupIds = [...new Set(groupIds)];
  
  if (uniqueGroupIds.length === 0) {
    return [];
  }
  
  // Get item IDs from GroupItem that match the groups
  const groupItems = await prisma.groupItem.findMany({
    where: {
      groupId: { in: uniqueGroupIds },
      itemType: itemType,
    },
    select: { itemId: true },
  });
  
  // Convert itemId strings to numbers
  const itemIds = groupItems
    .map(item => Number(item.itemId))
    .filter(id => !isNaN(id));
  
  return [...new Set(itemIds)]; // Remove duplicates
}

