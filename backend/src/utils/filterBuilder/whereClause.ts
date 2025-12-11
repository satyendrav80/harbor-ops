/**
 * Where clause building utilities
 */

import type { Filter, FilterNode } from '../../types/filterMetadata';
import { isFilterGroup, buildConditionClause } from './conditions';

/**
 * Builds a Prisma where clause from a nested filter structure (recursive)
 */
function buildWhereClauseRecursive(node: FilterNode): any {
  // If it's a single condition (leaf node)
  if (!isFilterGroup(node)) {
    return buildConditionClause(node);
  }

  // If it's a group (branch node)
  const { condition, childs } = node;

  // Handle empty childs array
  if (!childs || childs.length === 0) {
    return {};
  }

  // If only one child, optimize by not wrapping in condition
  if (childs.length === 1) {
    const childClause = buildWhereClauseRecursive(childs[0]);
    if (condition === 'not') {
      return { NOT: childClause };
    }
    return childClause;
  }

  // Build clauses for all children
  const childClauses = childs
    .map(child => buildWhereClauseRecursive(child))
    .filter(clause => clause && Object.keys(clause).length > 0);

  if (childClauses.length === 0) {
    return {};
  }

  if (childClauses.length === 1) {
    if (condition === 'not') {
      return { NOT: childClauses[0] };
    }
    return childClauses[0];
  }

  // Combine clauses based on condition type
  switch (condition) {
    case 'and':
      return { AND: childClauses };
    
    case 'or':
      return { OR: childClauses };
    
    case 'not':
      return { NOT: { AND: childClauses } };
    
    default:
      return { AND: childClauses };
  }
}

/**
 * Builds a Prisma where clause from a filter structure
 * Supports both new nested structure and legacy flat array structure for backward compatibility
 */
export function buildWhereClause(filter: Filter | Filter[]): any {
  // Handle legacy array format for backward compatibility
  if (Array.isArray(filter)) {
    const clauses = filter
      .map((f: any) => {
        if (f.field) {
          // Legacy format with 'field' instead of 'key'
          return buildConditionClause({
            key: f.field,
            type: f.type || 'STRING',
            operator: f.operator,
            value: f.value,
            caseSensitive: f.caseSensitive,
          });
        }
        return {};
      })
      .filter(c => c && Object.keys(c).length > 0);
    
    if (clauses.length === 0) return {};
    if (clauses.length === 1) return clauses[0];
    return { AND: clauses };
  }

  // New nested structure
  return buildWhereClauseRecursive(filter);
}

/**
 * Merges multiple where clauses (useful for combining filters with search)
 */
export function mergeWhereClauses(...clauses: any[]): any {
  const merged: any = {};

  for (const clause of clauses) {
    if (!clause || typeof clause !== 'object') continue;

    for (const [key, value] of Object.entries(clause)) {
      if (merged[key] && typeof merged[key] === 'object' && typeof value === 'object' && !Array.isArray(value)) {
        // Merge nested objects
        merged[key] = mergeWhereClauses(merged[key], value);
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

