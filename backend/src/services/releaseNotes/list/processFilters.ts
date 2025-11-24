/**
 * Filter processing utilities
 */

import { PrismaClient, ReleaseStatus } from '@prisma/client';
import type { Filter, FilterNode, FilterCondition, FilterGroup } from '../../../types/filterMetadata';
import { isFilterGroup } from '../../../utils/filterBuilder';
import { resolveSpecialDateValue } from '../../../utils/dateHelpers';

const prisma = new PrismaClient();

/**
 * Check if a node is a FilterGroup
 */
function isFilterGroupNode(node: FilterNode): node is FilterGroup {
  return isFilterGroup(node);
}

/**
 * Process and transform a single filter condition for release notes
 * - Converts status strings to ReleaseStatus enum
 * - Converts date strings to Date objects
 */
function processCondition(condition: FilterCondition): FilterCondition {
  // Convert status string values to ReleaseStatus enum
  if (condition.key === 'status' && condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
    if (Array.isArray(condition.value)) {
      return {
        ...condition,
        value: condition.value.map((v: string) => {
          if (v === 'pending') return ReleaseStatus.pending;
          if (v === 'deployed') return ReleaseStatus.deployed;
          if (v === 'deployment_started') return ReleaseStatus.deployment_started;
          return v;
        }),
      };
    } else if (typeof condition.value === 'string') {
      const statusMap: Record<string, ReleaseStatus> = {
        pending: ReleaseStatus.pending,
        deployed: ReleaseStatus.deployed,
        deployment_started: ReleaseStatus.deployment_started,
      };
      return {
        ...condition,
        value: statusMap[condition.value] || condition.value,
      };
    }
  }

  // Convert date strings to Date objects for date fields
  // Handle special date values (now, today, yesterday, etc.)
  if (['createdAt', 'updatedAt', 'publishDate'].includes(condition.key) && 
      (condition.type === 'DATE' || condition.type === 'DATETIME')) {
    if (condition.operator === 'between' && Array.isArray(condition.value)) {
      return {
        ...condition,
        value: condition.value.map((v: string) => resolveSpecialDateValue(v)),
      };
    } else if (typeof condition.value === 'string' && condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
      return {
        ...condition,
        value: resolveSpecialDateValue(condition.value),
      };
    }
  }

  return condition;
}

/**
 * Process and transform filters for release notes (recursive)
 * - Converts status strings to ReleaseStatus enum
 * - Converts date strings to Date objects
 */
function processFiltersRecursive(node: FilterNode): FilterNode {
  if (!isFilterGroupNode(node)) {
    // It's a single condition
    return processCondition(node);
  }

  // It's a group, process all children recursively
  return {
    ...node,
    childs: node.childs.map(child => processFiltersRecursive(child)),
  };
}

/**
 * Process and transform filters for release notes
 * Handles both new nested structure and legacy flat array structure
 */
export function processFilters(filters: Filter | Filter[]): Filter | Filter[] {
  // Handle legacy array format
  if (Array.isArray(filters)) {
    return filters.map((filter: any) => {
      // Legacy format with 'field' instead of 'key'
      if (filter.field) {
        const condition: FilterCondition = {
          key: filter.field,
          type: filter.type || 'STRING',
          operator: filter.operator,
          value: filter.value,
          caseSensitive: filter.caseSensitive,
        };
        return processCondition(condition);
      }
      return filter;
    });
  }

  // New nested structure
  return processFiltersRecursive(filters);
}

