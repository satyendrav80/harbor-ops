/**
 * Core filter type definitions
 * 
 * This file contains all fundamental types for the filter system.
 * All other modules import from here to avoid circular dependencies.
 */

/**
 * Filter operators supported by the system
 */
export type FilterOperator = 
  | 'eq'           // equals
  | 'ne'           // not equals
  | 'gt'           // greater than
  | 'gte'          // greater than or equal
  | 'lt'           // less than
  | 'lte'          // less than or equal
  | 'in'           // in array
  | 'notIn'        // not in array
  | 'contains'     // string contains (case-insensitive by default)
  | 'startsWith'   // string starts with
  | 'endsWith'     // string ends with
  | 'between'      // between two values [start, end]
  | 'isNull'       // field is NULL
  | 'isNotNull';   // field is NOT NULL

/**
 * Field types supported by the filter system
 */
export type FieldType = 
  | 'INT' 
  | 'STRING' 
  | 'FLOAT' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'DATETIME' 
  | 'ARRAY' 
  | 'JSON';

/**
 * Condition types for nested filter groups
 */
export type ConditionType = 'and' | 'or' | 'not';

/**
 * Single filter condition (leaf node)
 */
export type FilterCondition = {
  key: string;
  type: FieldType;
  operator: FilterOperator;
  value?: any; // Optional for isNull/isNotNull
  caseSensitive?: boolean; // For string operations
};

/**
 * Nested condition group (branch node)
 */
export type FilterGroup = {
  condition: ConditionType;
  childs: FilterNode[];
};

/**
 * Filter node can be either a single condition or a group
 */
export type FilterNode = FilterCondition | FilterGroup;

/**
 * Root filter structure
 */
export type Filter = FilterGroup | FilterCondition;

/**
 * Order by item for sorting
 */
export type OrderByItem = {
  key: string;
  type?: FieldType;
  direction: 'asc' | 'desc';
};

/**
 * UI configuration for a filter field
 */
export type FilterFieldUI = {
  placeholder?: string;
  inputType: 'text' | 'number' | 'email' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';
  options?: Array<{ value: string; label: string }>;
  supportsRange?: boolean;
};

/**
 * Metadata for a single filterable field
 */
export type FilterFieldMetadata = {
  key: string;
  label: string;
  type: FieldType;
  operators: FilterOperator[];
  relation?: string | null;
  relationType?: 'one' | 'many' | null;
  searchable: boolean;
  sortable: boolean;
  groupable: boolean; // Whether this field can be used for grouping results
  enumValues?: string[];
  ui: FilterFieldUI;
  // Special configurations
  relationModel?: string | null; // Model name for relation-based dropdowns (e.g., 'Service' for serviceId)
  relationField?: string | null; // Field name in relation to display (e.g., 'name' for service.name)
};

/**
 * Metadata for a relation
 */
export type RelationMetadata = {
  name: string;
  type: 'one' | 'many';
  label: string;
  model: string;
  fields: Array<{
    key: string;
    label: string;
    type: FieldType;
  }>;
};

/**
 * Complete filter metadata for a resource
 */
export type FilterMetadata = {
  fields: FilterFieldMetadata[];
  relations: RelationMetadata[];
  defaultSort: {
    key: string;
    direction: 'asc' | 'desc';
  };
  supportedOperators: Record<FieldType, FilterOperator[]>;
};
