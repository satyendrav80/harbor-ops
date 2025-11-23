/**
 * Filter type definitions
 * These match the backend filter structure
 */

export type FilterOperator = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith'
  | 'between' | 'isNull' | 'isNotNull';

export type FieldType = 
  | 'INT' | 'STRING' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'ARRAY' | 'JSON';

export type ConditionType = 'and' | 'or' | 'not';

export type FilterCondition = {
  key: string;
  type: FieldType;
  operator: FilterOperator;
  value?: any;
  caseSensitive?: boolean;
};

export type FilterGroup = {
  condition: ConditionType;
  childs: FilterNode[];
};

export type FilterNode = FilterCondition | FilterGroup;

export type Filter = FilterGroup | FilterCondition;

export type OrderByItem = {
  key: string;
  type?: FieldType;
  direction: 'asc' | 'desc';
};

export type FilterFieldMetadata = {
  key: string;
  label: string;
  type: FieldType;
  operators: FilterOperator[];
  relation?: string | null;
  relationType?: 'one' | 'many' | null;
  searchable: boolean;
  sortable: boolean;
  enumValues?: string[];
  relationModel?: string | null; // Model name for relation-based dropdowns (e.g., 'Service' for serviceId)
  relationField?: string | null; // Field name in relation to display (e.g., 'name' for service.name)
  ui: {
    placeholder?: string;
    inputType: 'text' | 'number' | 'email' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';
    options?: Array<{ value: string; label: string }>;
    supportsRange?: boolean;
  };
};

export type FilterMetadata = {
  fields: FilterFieldMetadata[];
  relations: any[];
  defaultSort: {
    key: string;
    direction: 'asc' | 'desc';
  };
  supportedOperators: Record<FieldType, FilterOperator[]>;
};

export type AdvancedFilterRequest = {
  filters?: Filter;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: OrderByItem | OrderByItem[];
};

