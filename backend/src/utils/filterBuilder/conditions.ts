/**
 * Condition building utilities
 */

import type { FilterCondition, FilterGroup, FilterNode } from '../../types/filterMetadata';

/**
 * Check if a node is a FilterGroup
 */
export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'condition' in node && 'childs' in node;
}

/**
 * Build Prisma where clause for a single condition
 */
export function buildConditionClause(condition: FilterCondition): any {
  const { key, operator, value, caseSensitive = false } = condition;

  // Handle nested fields (e.g., 'service.id', 'createdByUser.name')
  const fieldParts = key.split('.');
  const finalField = fieldParts[fieldParts.length - 1];

  let clause: any = {};

  // Apply operator
  switch (operator) {
    case 'eq':
      clause[finalField] = value;
      break;

    case 'ne':
      clause[finalField] = { not: value };
      break;

    case 'gt':
      clause[finalField] = { gt: value };
      break;

    case 'gte':
      clause[finalField] = { gte: value };
      break;

    case 'lt':
      clause[finalField] = { lt: value };
      break;

    case 'lte':
      clause[finalField] = { lte: value };
      break;

    case 'in':
      if (Array.isArray(value) && value.length > 0) {
        clause[finalField] = value.length === 1 ? value[0] : { in: value };
      }
      break;

    case 'notIn':
      if (Array.isArray(value) && value.length > 0) {
        clause[finalField] = { notIn: value };
      }
      break;

    case 'contains':
      clause[finalField] = { 
        contains: value,
        mode: caseSensitive ? 'default' : 'insensitive'
      };
      break;

    case 'startsWith':
      clause[finalField] = { 
        startsWith: value,
        mode: caseSensitive ? 'default' : 'insensitive'
      };
      break;

    case 'endsWith':
      clause[finalField] = { 
        endsWith: value,
        mode: caseSensitive ? 'default' : 'insensitive'
      };
      break;

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        let endValue = value[1];
        // For date fields, ensure the end date includes the full day
        if (finalField.includes('Date') || finalField.includes('At') || condition.type === 'DATE' || condition.type === 'DATETIME') {
          if (endValue instanceof Date) {
            endValue = new Date(endValue);
            endValue.setHours(23, 59, 59, 999);
          } else if (typeof endValue === 'string') {
            const date = new Date(endValue);
            date.setHours(23, 59, 59, 999);
            endValue = date;
          }
        }
        clause[finalField] = { gte: value[0], lte: endValue };
      }
      break;

    case 'isNull':
      clause[finalField] = null;
      break;

    case 'isNotNull':
      clause[finalField] = { not: null };
      break;

    default:
      return {};
  }

  // Handle nested field structure
  if (fieldParts.length > 1) {
    let nestedClause = clause;
    for (let i = fieldParts.length - 2; i >= 0; i--) {
      nestedClause = { [fieldParts[i]]: nestedClause };
    }
    return nestedClause;
  }

  return clause;
}

