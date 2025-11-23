/**
 * Operator mapping utilities
 */

import type { FilterOperator, FieldType } from '../../types/filterMetadata';
import { BASE_OPERATORS, NULL_OPERATORS, NUMERIC_OPERATORS, STRING_OPERATORS, DATE_OPERATORS } from '../filterBuilder/operators';

/**
 * Get supported operators for a field type
 * 
 * @param fieldType - The type of the field
 * @param isOptional - Whether the field is optional/nullable
 * @returns Array of supported operators
 */
export function getOperatorsForType(fieldType: FieldType, isOptional: boolean = false): FilterOperator[] {
  const operators: FilterOperator[] = [...BASE_OPERATORS];

  switch (fieldType) {
    case 'INT':
    case 'FLOAT':
      operators.push(...NUMERIC_OPERATORS);
      break;

    case 'STRING':
      operators.push(...STRING_OPERATORS);
      break;

    case 'DATETIME':
    case 'DATE':
      operators.push(...DATE_OPERATORS);
      break;

    case 'BOOLEAN':
      // Boolean only supports eq, ne
      break;

    case 'ARRAY':
      operators.push('in', 'notIn');
      break;

    case 'JSON':
      // JSON fields typically only support existence checks
      break;

    default:
      // Default to string operators for unknown types
      operators.push(...STRING_OPERATORS);
  }

  // Add NULL operators for optional fields
  if (isOptional) {
    operators.push(...NULL_OPERATORS);
  }

  return operators;
}

/**
 * Get all supported operators grouped by field type
 * Useful for metadata API responses
 */
export function getAllSupportedOperators(): Record<FieldType, FilterOperator[]> {
  return {
    INT: getOperatorsForType('INT', true),
    STRING: getOperatorsForType('STRING', true),
    FLOAT: getOperatorsForType('FLOAT', true),
    BOOLEAN: getOperatorsForType('BOOLEAN', true),
    DATE: getOperatorsForType('DATE', true),
    DATETIME: getOperatorsForType('DATETIME', true),
    ARRAY: getOperatorsForType('ARRAY', true),
    JSON: getOperatorsForType('JSON', true),
  };
}

