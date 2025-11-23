/**
 * Operator definitions and constants
 */

import type { FilterOperator } from '../../types/filterMetadata';

/**
 * Base operators available for all field types
 */
export const BASE_OPERATORS: FilterOperator[] = ['eq', 'ne'];

/**
 * Operators for optional/nullable fields
 */
export const NULL_OPERATORS: FilterOperator[] = ['isNull', 'isNotNull'];

/**
 * Operators for numeric comparisons
 */
export const NUMERIC_OPERATORS: FilterOperator[] = ['gt', 'gte', 'lt', 'lte', 'in', 'notIn'];

/**
 * Operators for string/text fields
 */
export const STRING_OPERATORS: FilterOperator[] = ['contains', 'startsWith', 'endsWith', 'in', 'notIn'];

/**
 * Operators for date/time fields
 */
export const DATE_OPERATORS: FilterOperator[] = ['gt', 'gte', 'lt', 'lte', 'between'];

