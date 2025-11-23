/**
 * Filter Builder Module
 * 
 * This index file exports all filter builder functions.
 * Each function is implemented in its own module file.
 */

export { buildWhereClause, mergeWhereClauses } from './whereClause';
export { buildSortClause } from './sortClause';
export { isFilterGroup, buildConditionClause } from './conditions';
export * from './operators';

// Re-export types for convenience
export type {
  FilterOperator,
  FieldType,
  ConditionType,
  FilterCondition,
  FilterGroup,
  FilterNode,
  Filter,
  OrderByItem,
} from '../../types/filterMetadata';

