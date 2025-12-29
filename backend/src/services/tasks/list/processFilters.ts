/**
 * Filter processing utilities
 */

import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import type { Filter, FilterNode, FilterCondition, FilterGroup } from '../../../types/filterMetadata';
import { isFilterGroup } from '../../../utils/filterBuilder';
import { resolveSpecialDateValue } from '../../../utils/dateHelpers';
import { prisma } from '../../../dataStore';

/**
 * Check if a node is a FilterGroup
 */
function isFilterGroupNode(node: FilterNode): node is FilterGroup {
  return isFilterGroup(node);
}

/**
 * Process and transform a single filter condition for tasks
 * - Converts status strings to TaskStatus enum
 * - Converts priority strings to TaskPriority enum
 * - Converts type strings to TaskType enum
 * - Converts date strings to Date objects
 */
function processCondition(condition: FilterCondition): FilterCondition {
  // Convert status string values to TaskStatus enum
  if (condition.key === 'status' && condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
    if (Array.isArray(condition.value)) {
      return {
        ...condition,
        value: condition.value.map((v: string) => {
          const statusMap: Record<string, TaskStatus> = {
            pending: TaskStatus.pending,
            in_progress: TaskStatus.in_progress,
            in_review: TaskStatus.in_review,
            proceed: TaskStatus.proceed,
            testing: TaskStatus.testing,
            not_fixed: TaskStatus.not_fixed,
            completed: TaskStatus.completed,
            duplicate: TaskStatus.duplicate,
            paused: TaskStatus.paused,
            blocked: TaskStatus.blocked,
            cancelled: TaskStatus.cancelled,
            reopened: TaskStatus.reopened,
          };
          return statusMap[v] || v;
        }),
      };
    } else if (typeof condition.value === 'string') {
      const statusMap: Record<string, TaskStatus> = {
        pending: TaskStatus.pending,
        in_progress: TaskStatus.in_progress,
        in_review: TaskStatus.in_review,
        proceed: TaskStatus.proceed,
        testing: TaskStatus.testing,
        not_fixed: TaskStatus.not_fixed,
        completed: TaskStatus.completed,
        duplicate: TaskStatus.duplicate,
        paused: TaskStatus.paused,
        blocked: TaskStatus.blocked,
        cancelled: TaskStatus.cancelled,
        reopened: TaskStatus.reopened,
      };
      return {
        ...condition,
        value: statusMap[condition.value] || condition.value,
      };
    }
  }

  // Convert priority string values to TaskPriority enum
  if (condition.key === 'priority' && condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
    if (Array.isArray(condition.value)) {
      return {
        ...condition,
        value: condition.value.map((v: string) => {
          const priorityMap: Record<string, TaskPriority> = {
            low: TaskPriority.low,
            medium: TaskPriority.medium,
            high: TaskPriority.high,
            critical: TaskPriority.critical,
          };
          return priorityMap[v] || v;
        }),
      };
    } else if (typeof condition.value === 'string') {
      const priorityMap: Record<string, TaskPriority> = {
        low: TaskPriority.low,
        medium: TaskPriority.medium,
        high: TaskPriority.high,
        critical: TaskPriority.critical,
      };
      return {
        ...condition,
        value: priorityMap[condition.value] || condition.value,
      };
    }
  }

  // Convert type string values to TaskType enum
  if (condition.key === 'type' && condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
    if (Array.isArray(condition.value)) {
      return {
        ...condition,
        value: condition.value.map((v: string) => {
          const typeMap: Record<string, TaskType> = {
            bug: TaskType.bug,
            feature: TaskType.feature,
            todo: TaskType.todo,
            epic: TaskType.epic,
            improvement: TaskType.improvement,
          };
          return typeMap[v] || v;
        }),
      };
    } else if (typeof condition.value === 'string') {
      const typeMap: Record<string, TaskType> = {
        bug: TaskType.bug,
        feature: TaskType.feature,
        todo: TaskType.todo,
        epic: TaskType.epic,
        improvement: TaskType.improvement,
      };
      return {
        ...condition,
        value: typeMap[condition.value] || condition.value,
      };
    }
  }

  // Convert date strings to Date objects for date fields
  // Handle special date values (now, today, yesterday, etc.)
  const dateFields = ['createdAt', 'updatedAt', 'dueDate', 'assignedAt', 'completedAt'];
  if (dateFields.includes(condition.key) && 
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
 * Process and transform filters for tasks (recursive)
 * - Converts enum strings to Prisma enums
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
 * Process and transform filters for tasks
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
