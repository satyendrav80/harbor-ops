/**
 * UI configuration utilities
 */

import type { FieldType, FilterFieldUI } from '../../types/filterMetadata';

/**
 * Get default UI configuration for a field type
 * 
 * @param fieldType - The type of the field
 * @param fieldName - The name of the field (for generating labels/placeholders)
 * @param isEnum - Whether the field is an enum
 * @param enumValues - Enum values if it's an enum field
 * @returns UI configuration object
 */
export function getDefaultUIConfig(
  fieldType: FieldType,
  fieldName: string,
  isEnum: boolean = false,
  enumValues?: string[]
): FilterFieldUI {
  // Format field name for labels
  const label = formatFieldLabel(fieldName);

  if (isEnum && enumValues) {
    return {
      placeholder: `Select ${label}...`,
      inputType: 'select',
      options: enumValues.map(value => ({
        value,
        label: formatFieldLabel(value),
      })),
    };
  }

  switch (fieldType) {
    case 'INT':
    case 'FLOAT':
      return {
        placeholder: `Enter ${label}...`,
        inputType: 'number',
      };

    case 'STRING':
      // Check if it looks like an email field
      if (fieldName.toLowerCase().includes('email')) {
        return {
          placeholder: `Enter ${label}...`,
          inputType: 'email',
        };
      }
      return {
        placeholder: `Enter ${label}...`,
        inputType: 'text',
      };

    case 'DATETIME':
    case 'DATE':
      return {
        placeholder: `Select ${label}...`,
        inputType: fieldType === 'DATE' ? 'date' : 'datetime',
        supportsRange: true,
      };

    case 'BOOLEAN':
      return {
        placeholder: `Select ${label}...`,
        inputType: 'checkbox',
      };

    case 'ARRAY':
      return {
        placeholder: `Select ${label}...`,
        inputType: 'multiselect',
      };

    default:
      return {
        placeholder: `Enter ${label}...`,
        inputType: 'text',
      };
  }
}

/**
 * Format field name to a human-readable label
 * 
 * @param fieldName - The field name (e.g., "createdAt", "serviceId")
 * @returns Formatted label (e.g., "Created At", "Service ID")
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/Id$/i, 'ID') // Capitalize ID
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

