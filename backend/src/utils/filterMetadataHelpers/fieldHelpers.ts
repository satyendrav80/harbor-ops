/**
 * Field helper utilities
 */

import type { FieldType } from '../../types/filterMetadata';

/**
 * Determine if a field should be searchable
 * Typically text fields that contain user-facing content
 * 
 * @param fieldName - The name of the field
 * @param fieldType - The type of the field
 * @returns Whether the field should be searchable
 */
export function isFieldSearchable(fieldName: string, fieldType: FieldType): boolean {
  if (fieldType !== 'STRING') {
    return false;
  }

  const searchableFieldNames = ['note', 'name', 'description', 'title', 'content', 'text'];
  return searchableFieldNames.some(name => fieldName.toLowerCase().includes(name));
}

/**
 * Determine if a field should be sortable
 * Most fields are sortable except for complex types
 * 
 * @param fieldType - The type of the field
 * @param relationType - If it's a relation field, the relation type
 * @returns Whether the field should be sortable
 */
export function isFieldSortable(fieldType: FieldType, relationType?: 'one' | 'many' | null): boolean {
  // Can't sort on many-to-many relations
  if (relationType === 'many') {
    return false;
  }

  // JSON and ARRAY types are typically not sortable
  if (fieldType === 'JSON' || fieldType === 'ARRAY') {
    return false;
  }

  return true;
}

