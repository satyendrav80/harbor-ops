/**
 * Filter processing utilities
 * Converts raw filter values (enums, dates, etc.) before building Prisma queries
 */

import { PrismaClient } from '@prisma/client';
import type { Filter, FilterNode, FilterCondition, FilterGroup } from '../../../types/filterMetadata';
import { isFilterGroup } from '../../../utils/filterBuilder';
import { resolveSpecialDateValue } from '../../../utils/dateHelpers';

const prisma = new PrismaClient();

function isFilterGroupNode(node: FilterNode): node is FilterGroup {
  return isFilterGroup(node);
}

function processCondition(condition: FilterCondition): FilterCondition {
  // Convert date strings to Date objects for date fields, resolving special values
  if (['createdAt', 'updatedAt'].includes(condition.key) && 
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

function processFiltersRecursive(node: FilterNode): FilterNode {
  if (isFilterGroupNode(node)) {
    return {
      ...node,
      childs: node.childs.map(processFiltersRecursive),
    };
  } else {
    return processCondition(node);
  }
}

/**
 * Process filters (convert enums, dates, etc.)
 */
export function processFilters(filters: Filter | Filter[]): Filter | Filter[] {
  if (Array.isArray(filters)) {
    return filters.map(processFiltersRecursive);
  } else {
    return processFiltersRecursive(filters);
  }
}

