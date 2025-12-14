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

/**
 * Determine if a field should be groupable
 * Only certain fields make sense for grouping (enums, status, relations, etc.)
 * Not all sortable fields should be groupable (e.g., don't group by title/description)
 * 
 * @param fieldName - The name/key of the field
 * @param fieldType - The type of the field
 * @param relationType - If it's a relation field, the relation type
 * @returns Whether the field should be groupable
 */
export function isFieldGroupable(fieldName: string, fieldType: FieldType, relationType?: 'one' | 'many' | null): boolean {
  // Can't group on many-to-many relations
  if (relationType === 'many') {
    return false;
  }

  // JSON and ARRAY types are not groupable
  if (fieldType === 'JSON' || fieldType === 'ARRAY') {
    return false;
  }

  // Groupable field patterns (enums, status, relations, etc.)
  const groupablePatterns = [
    'status', 'priority', 'type', 'sprint', 'service', 'assignedTo', 'tester', 
    'attentionTo', 'createdBy', 'updatedBy', 'completedBy', 'parentTask'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check if field name matches groupable patterns
  if (groupablePatterns.some(pattern => lowerFieldName.includes(pattern.toLowerCase()))) {
    return true;
  }
  
  // Relation fields (e.g., assignedToUser.name) are groupable if they're one-to-one
  if (relationType === 'one' && lowerFieldName.includes('user') || lowerFieldName.includes('service') || lowerFieldName.includes('sprint')) {
    return true;
  }
  
  return false;
}

