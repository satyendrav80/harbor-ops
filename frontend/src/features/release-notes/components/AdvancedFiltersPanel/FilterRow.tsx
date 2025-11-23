/**
 * Single filter row component
 */

import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '../../../../services/services';
import { getGroups } from '../../../../services/groups';
import { getTags } from '../../../../services/tags';
import { getServers } from '../../../../services/servers';
import { SearchableMultiSelect } from '../../../../components/common/SearchableMultiSelect';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { SPECIAL_DATE_OPTIONS, isSpecialDateValue, type SpecialDateValue } from '../../utils/dateHelpers';
import type { FilterRow } from './types';
import type { FilterFieldMetadata } from '../../types/filters';

type FilterRowProps = {
  row: FilterRow;
  fields: FilterFieldMetadata[];
  onUpdate: (id: string, updates: Partial<FilterRow>) => void;
  onRemove: (id: string) => void;
};

// Memoize special date options outside component to ensure stability
const SPECIAL_DATE_OPTIONS_MAPPED = SPECIAL_DATE_OPTIONS.map((opt) => ({ 
  value: String(opt.value), 
  label: opt.label 
}));

export function FilterRowComponent({ row, fields, onUpdate, onRemove }: FilterRowProps) {
  const field = fields.find(f => f.key === row.fieldKey);
  
  const handleFieldChange = (fieldKey: string) => {
    const selectedField = fields.find(f => f.key === fieldKey);
    onUpdate(row.id, {
      fieldKey,
      operator: selectedField?.operators[0] || 'eq',
      value: undefined,
      fieldMetadata: selectedField,
    });
  };

  const handleOperatorChange = (operator: string) => {
    onUpdate(row.id, { operator, value: undefined });
  };

  const handleValueChange = (value: any) => {
    onUpdate(row.id, { value });
  };

  if (!field) return null;

  const operators = field.operators || [];
  const isValueRequired = row.operator !== 'isNull' && row.operator !== 'isNotNull';

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-[1fr_1fr_2fr] gap-2 min-w-0">
          {/* Field Select */}
          <div className="min-w-0">
            <SearchableSelect
              options={fields.map((f) => ({ value: f.key, label: f.label }))}
              value={row.fieldKey}
              onChange={handleFieldChange}
              placeholder="Select field..."
              className="w-full"
            />
          </div>

          {/* Operator Select */}
          <div className="min-w-0">
            <SearchableSelect
              options={operators.map((op) => ({ value: op, label: formatOperator(op) }))}
              value={row.operator}
              onChange={handleOperatorChange}
              placeholder="Select operator..."
              className="w-full"
            />
          </div>

          {/* Value Input */}
          {isValueRequired && (
            <div className="min-w-0">
              {renderValueInput(field, row.operator, row.value, handleValueChange, row.fieldKey, row.id)}
            </div>
          )}
        </div>

        <button
          onClick={() => onRemove(row.id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 flex-shrink-0 self-start"
          aria-label="Remove filter"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function formatOperator(op: string): string {
  const operatorMap: Record<string, string> = {
    eq: 'equals',
    ne: 'not equals',
    gt: 'greater than',
    gte: 'greater than or equal',
    lt: 'less than',
    lte: 'less than or equal',
    in: 'in',
    notIn: 'not in',
    contains: 'contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    between: 'between',
    isNull: 'is null',
    isNotNull: 'is not null',
  };
  return operatorMap[op] || op;
}

function renderValueInput(
  field: FilterFieldMetadata,
  operator: string,
  value: any,
  onChange: (value: any) => void,
  fieldKey?: string,
  rowId?: string
) {
  // Handle 'in' and 'notIn' operators first - these always need multi-select for ANY field that supports them
  if (operator === 'in' || operator === 'notIn') {
    // Config-based service dropdown - check relationModel
    if (field.relationModel === 'Service') {
      return <ServiceSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }

    // Config-based group dropdown
    if (field.relationModel === 'Group') {
      return <GroupSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }

    // Config-based tag dropdown
    if (field.relationModel === 'Tag') {
      return <TagSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }

    // Config-based server dropdown
    if (field.relationModel === 'Server') {
      return <ServerSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }

    // Enum fields with predefined options - use SearchableMultiSelect
    if (field.ui.options && field.ui.options.length > 0) {
      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
      const options = field.ui.options.map((opt, idx) => ({
        id: idx,
        name: opt.label,
      }));
      const selectedIds = selectedValues
        .map((val: string) => {
          const idx = field.ui.options?.findIndex((opt) => opt.value === val);
          return idx !== undefined && idx >= 0 ? idx : -1;
        })
        .filter((id: number) => id >= 0);

      return (
        <div className="w-full min-w-0">
          <SearchableMultiSelect
            options={options}
            selectedIds={selectedIds}
            onChange={(selectedIds) => {
              const selectedValues = selectedIds
                .map((id) => field.ui.options?.[id]?.value)
                .filter((val): val is string => val !== undefined);
              onChange(selectedValues);
            }}
            placeholder={`Select ${field.label}...`}
            className="w-full"
          />
        </div>
      );
    }

    // For INT/FLOAT fields, use IdMultiSelect (number input)
    if (field.type === 'INT' || field.type === 'FLOAT') {
      return <IdMultiSelect value={value} onChange={onChange} fieldType={field.type} />;
    }

    // For ALL other field types (STRING, DATE, DATETIME, BOOLEAN, etc.), use GenericMultiSelect
    // This works for any field that supports 'in' or 'notIn' operators
    return <GenericMultiSelect value={value} onChange={onChange} fieldType={field.type} placeholder={`Enter ${field.label}...`} />;
  }

  // For non-multi-select operators, handle relation models
  // Pattern search operators (contains, startsWith, endsWith) should use text input, not dropdown
  // Exact match operators (eq, ne) should use dropdown for relation fields
  const isPatternSearchOperator = operator === 'contains' || operator === 'startsWith' || operator === 'endsWith';
  
  // For pattern search operators, show text input even for relation fields
  if (isPatternSearchOperator) {
    // Fall through to text input below
  } else if (field.relationModel === 'Service') {
    // For exact match operators (eq, ne), show dropdown
    return <ServiceSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
  } else if (field.relationModel === 'Group') {
    return <GroupSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
  } else if (field.relationModel === 'Tag') {
    return <TagSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
  } else if (field.relationModel === 'Server') {
    return <ServerSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
  }

  if (operator === 'between') {
    const fromValue = Array.isArray(value) ? value[0] : '';
    const toValue = Array.isArray(value) ? value[1] : '';
    const fromIsSpecial = isSpecialDateValue(fromValue);
    const toIsSpecial = isSpecialDateValue(toValue);
    
    if (field.ui.inputType === 'date' || field.ui.inputType === 'datetime') {
      return (
        <div className="w-full min-w-0 space-y-1.5">
          <div className="flex gap-1.5 items-center">
            <select
              value={fromIsSpecial ? 'special' : 'custom'}
              onChange={(e) => {
                const newFrom = e.target.value === 'special' ? SPECIAL_DATE_OPTIONS[0].value : '';
                onChange([newFrom, toValue]);
              }}
              className="px-2 py-2 text-xs bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0"
              title="From date type"
            >
              <option value="custom">Date</option>
              <option value="special">Special</option>
            </select>
            {fromIsSpecial ? (
              <div className="flex-1 min-w-0 relative" key="special-date-from">
                <SearchableSelect
                  key={`special-date-from-${rowId || fieldKey || 'default'}`}
                  options={SPECIAL_DATE_OPTIONS_MAPPED}
                  value={fromValue ? String(fromValue) : String(SPECIAL_DATE_OPTIONS[0].value)}
                  onChange={(val) => onChange([val as SpecialDateValue, toValue])}
                  placeholder="Select special date..."
                  className="w-full"
                />
              </div>
            ) : (
              <input
                type="date"
                value={typeof fromValue === 'string' && !isSpecialDateValue(fromValue) ? fromValue : ''}
                onChange={(e) => onChange([e.target.value, toValue])}
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="From"
              />
            )}
          </div>
          <div className="flex gap-1.5 items-center">
            <select
              value={toIsSpecial ? 'special' : 'custom'}
              onChange={(e) => {
                const newTo = e.target.value === 'special' ? SPECIAL_DATE_OPTIONS[0].value : '';
                onChange([fromValue, newTo]);
              }}
              className="px-2 py-2 text-xs bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0"
              title="To date type"
            >
              <option value="custom">Date</option>
              <option value="special">Special</option>
            </select>
            {toIsSpecial ? (
              <div className="flex-1 min-w-0 relative" key="special-date-to">
                <SearchableSelect
                  key={`special-date-to-${rowId || fieldKey || 'default'}`}
                  options={SPECIAL_DATE_OPTIONS_MAPPED}
                  value={toValue ? String(toValue) : String(SPECIAL_DATE_OPTIONS[0].value)}
                  onChange={(val) => onChange([fromValue, val as SpecialDateValue])}
                  placeholder="Select special date..."
                  className="w-full"
                />
              </div>
            ) : (
              <input
                type="date"
                value={typeof toValue === 'string' && !isSpecialDateValue(toValue) ? toValue : ''}
                onChange={(e) => onChange([fromValue, e.target.value])}
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="To"
              />
            )}
          </div>
        </div>
      );
    }
    
    // Non-date between (fallback to original)
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={fromValue || ''}
          onChange={(e) => onChange([e.target.value, toValue])}
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="From"
        />
        <input
          type="text"
          value={toValue || ''}
          onChange={(e) => onChange([fromValue, e.target.value])}
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="To"
        />
      </div>
    );
  }



  if (field.ui.inputType === 'select') {
    // Single select - use SearchableSelect
    return (
      <SearchableSelect
        options={field.ui.options || []}
        value={value || ''}
        onChange={onChange}
        placeholder="Select..."
        className="w-full"
      />
    );
  }

  if (field.ui.inputType === 'multiselect') {
    // Multi-select - use SearchableMultiSelect
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const options = (field.ui.options || []).map((opt, idx) => ({
      id: idx,
      name: opt.label,
    }));
    const selectedIds = selectedValues
      .map((val: string) => {
        const idx = field.ui.options?.findIndex((opt) => opt.value === val);
        return idx !== undefined && idx >= 0 ? idx : -1;
      })
      .filter((id: number) => id >= 0);

    return (
      <div className="w-full min-w-0">
        <SearchableMultiSelect
          options={options}
          selectedIds={selectedIds}
          onChange={(selectedIds) => {
            const selectedValues = selectedIds
              .map((id) => field.ui.options?.[id]?.value)
              .filter((val): val is string => val !== undefined);
            onChange(selectedValues);
          }}
          placeholder={`Select ${field.label}...`}
          className="w-full"
        />
      </div>
    );
  }

  if (field.ui.inputType === 'date' || field.ui.inputType === 'datetime') {
    const isSpecialValue = isSpecialDateValue(value);
    // Extract date value - handle both string dates and Date objects
    let dateValue = '';
    if (value && !isSpecialValue) {
      if (typeof value === 'string') {
        dateValue = value;
      } else if (value instanceof Date) {
        // Convert Date to YYYY-MM-DD format for date input
        dateValue = value.toISOString().split('T')[0];
      }
    }
    
    return (
      <div className="w-full min-w-0">
        <div className="flex gap-1 items-center min-w-0">
          <select
            value={isSpecialValue ? 'special' : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'special') {
                onChange(SPECIAL_DATE_OPTIONS[0].value);
              } else {
                onChange('');
              }
            }}
            className="px-1.5 py-2 text-xs bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0"
            title={isSpecialValue ? 'Switch to custom date' : 'Switch to special value'}
          >
            <option value="custom">Date</option>
            <option value="special">Special</option>
          </select>
          {isSpecialValue ? (
            <div className="flex-1 min-w-0 relative" key="special-date-select">
              <SearchableSelect
                key={`special-date-${rowId || fieldKey || 'default'}`}
                options={SPECIAL_DATE_OPTIONS_MAPPED}
                value={value ? String(value) : String(SPECIAL_DATE_OPTIONS[0].value)}
                onChange={(val) => onChange(val as SpecialDateValue)}
                placeholder="Select special date..."
                className="w-full"
              />
            </div>
          ) : (
            <input
              type="date"
              value={dateValue}
              onChange={(e) => onChange(e.target.value || undefined)}
              className="flex-1 min-w-0 px-2 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
        </div>
      </div>
    );
  }

  if (field.ui.inputType === 'number') {
    return (
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
        placeholder={field.ui.placeholder}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
      placeholder={field.ui.placeholder}
    />
  );
}

/**
 * Service Select Component
 * Handles both single select (eq, ne) and multi-select (in, notIn) for serviceId field
 * Also handles service.name with in/notIn operators
 */
function ServiceSelect({
  value,
  onChange,
  operator,
  fieldKey,
}: {
  value: any;
  onChange: (value: any) => void;
  operator: string;
  fieldKey?: string;
}) {
  // Fetch all services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: async () => {
      const result = await getServices(1, 1000);
      return result.data;
    },
  });

  // Ensure services is always an array
  const services = Array.isArray(servicesData) ? servicesData : [];

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded">
        Loading services...
      </div>
    );
  }

  // Determine if this is a name field (returns names) or ID field (returns IDs)
  const isNameField = fieldKey?.includes('.name') || fieldKey === 'service.name' || fieldKey === 'dependencies.dependencyService.name';

  // For 'in' and 'notIn' operators, use multi-select
  if (operator === 'in' || operator === 'notIn') {
    // Convert services to SearchableMultiSelect format
    const options = services.map((service) => ({
      id: service.id,
      name: `${service.name} (${service.port})`,
    }));

    // Determine selected IDs based on field type
    let selectedIds: number[] = [];
    if (isNameField) {
      // For name fields, value is an array of service names
      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
      selectedIds = selectedNames
        .map((name: string) => {
          const service = services.find((s) => s.name === name);
          return service?.id;
        })
        .filter((id): id is number => id !== undefined);
    } else {
      // For ID fields, value is an array of service IDs
      selectedIds = Array.isArray(value)
        ? value.map((v) => Number(v)).filter((id) => !isNaN(id))
        : value
        ? [Number(value)].filter((id) => !isNaN(id))
        : [];
    }

    return (
      <div className="w-full min-w-0">
        <SearchableMultiSelect
          options={options}
          selectedIds={selectedIds}
          onChange={(selectedIds) => {
            if (isNameField) {
              // Return service names for name fields
              const selectedServices = selectedIds
                .map((id) => services.find((s) => s.id === id))
                .filter((s): s is typeof services[0] => s !== undefined);
              onChange(selectedServices.map((s) => s.name));
            } else {
              // Return service IDs for ID fields
              onChange(selectedIds);
            }
          }}
          placeholder="Select services..."
          className="w-full"
        />
      </div>
    );
  }

  // For other operators (eq, ne, etc.), use searchable single select
  return (
    <SearchableSelect
      options={services.map((service) => ({
        value: isNameField ? service.name : String(service.id),
        label: `${service.name} (Port: ${service.port})`,
      }))}
      value={value ? String(value) : ''}
      onChange={(val) => onChange(isNameField ? val : val ? Number(val) : undefined)}
      placeholder="Select service..."
      className="w-full"
    />
  );
}

/**
 * Group Select Component
 * Handles both single select (eq, ne) and multi-select (in, notIn) for group fields
 */
function GroupSelect({
  value,
  onChange,
  operator,
  fieldKey,
}: {
  value: any;
  onChange: (value: any) => void;
  operator: string;
  fieldKey?: string;
}) {
  // Fetch all groups
  const { data: groupsData, isLoading, error } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: async () => {
      try {
        const result = await getGroups(1, 1000);
        // Ensure we return an array
        return Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Error fetching groups:', err);
        return [];
      }
    },
  });

  // Ensure groups is always an array
  const groups = Array.isArray(groupsData) ? groupsData : [];

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded">
        Loading groups...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2 text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 rounded">
        Error loading groups
      </div>
    );
  }

  // Determine if this is a name field (returns names) or ID field (returns IDs)
  const isNameField = fieldKey?.includes('.name') || fieldKey === 'groups.name';

  // For 'in' and 'notIn' operators, use multi-select
  if (operator === 'in' || operator === 'notIn') {
    // Convert groups to SearchableMultiSelect format
    const options = groups.map((group) => ({
      id: group.id,
      name: group.name,
    }));

    // Determine selected IDs based on field type
    let selectedIds: number[] = [];
    if (isNameField) {
      // For name fields, value is an array of group names
      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
      selectedIds = selectedNames
        .map((name: string) => {
          const group = groups.find((g) => g.name === name);
          return group?.id;
        })
        .filter((id): id is number => id !== undefined);
    } else {
      // For ID fields, value is an array of group IDs
      selectedIds = Array.isArray(value)
        ? value.map((v) => Number(v)).filter((id) => !isNaN(id))
        : value
        ? [Number(value)].filter((id) => !isNaN(id))
        : [];
    }

    return (
      <div className="w-full min-w-0">
        <SearchableMultiSelect
          options={options}
          selectedIds={selectedIds}
          onChange={(selectedIds) => {
            if (isNameField) {
              // Return group names for name fields
              const selectedGroups = selectedIds
                .map((id) => groups.find((g) => g.id === id))
                .filter((g): g is typeof groups[0] => g !== undefined);
              onChange(selectedGroups.map((g) => g.name));
            } else {
              // Return group IDs for ID fields
              onChange(selectedIds);
            }
          }}
          placeholder="Select groups..."
          className="w-full"
        />
      </div>
    );
  }

  // For other operators (eq, ne, etc.), use searchable single select
  return (
    <SearchableSelect
      options={groups.map((group) => ({
        value: isNameField ? group.name : String(group.id),
        label: group.name,
      }))}
      value={value ? String(value) : ''}
      onChange={(val) => onChange(isNameField ? val : val ? Number(val) : undefined)}
      placeholder="Select group..."
      className="w-full"
    />
  );
}

/**
 * Tag Select Component
 * Handles both single select (eq, ne) and multi-select (in, notIn) for tag fields
 */
function TagSelect({
  value,
  onChange,
  operator,
  fieldKey,
}: {
  value: any;
  onChange: (value: any) => void;
  operator: string;
  fieldKey?: string;
}) {
  // Fetch all tags
  const { data: tagsData, isLoading, error } = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: async () => {
      try {
        const result = await getTags(1, 1000);
        // Ensure we return an array
        return Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Error fetching tags:', err);
        return [];
      }
    },
  });

  // Ensure tags is always an array
  const tags = Array.isArray(tagsData) ? tagsData : [];

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded">
        Loading tags...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2 text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 rounded">
        Error loading tags
      </div>
    );
  }

  // Determine if this is a name field (returns names) or ID field (returns IDs)
  const isNameField = fieldKey?.includes('.name') || fieldKey === 'tags.name';

  // For 'in' and 'notIn' operators, use multi-select
  if (operator === 'in' || operator === 'notIn') {
    // Convert tags to SearchableMultiSelect format
    const options = tags.map((tag) => ({
      id: tag.id,
      name: tag.value ? `${tag.name}: ${tag.value}` : tag.name,
    }));

    // Determine selected IDs based on field type
    let selectedIds: number[] = [];
    if (isNameField) {
      // For name fields, value is an array of tag names
      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
      selectedIds = selectedNames
        .map((name: string) => {
          const tag = tags.find((t) => t.name === name);
          return tag?.id;
        })
        .filter((id): id is number => id !== undefined);
    } else {
      // For ID fields, value is an array of tag IDs
      selectedIds = Array.isArray(value)
        ? value.map((v) => Number(v)).filter((id) => !isNaN(id))
        : value
        ? [Number(value)].filter((id) => !isNaN(id))
        : [];
    }

    return (
      <div className="w-full min-w-0">
        <SearchableMultiSelect
          options={options}
          selectedIds={selectedIds}
          onChange={(selectedIds) => {
            if (isNameField) {
              // Return tag names for name fields
              const selectedTags = selectedIds
                .map((id) => tags.find((t) => t.id === id))
                .filter((t): t is typeof tags[0] => t !== undefined);
              onChange(selectedTags.map((t) => t.name));
            } else {
              // Return tag IDs for ID fields
              onChange(selectedIds);
            }
          }}
          placeholder="Select tags..."
          className="w-full"
        />
      </div>
    );
  }

  // For other operators (eq, ne, etc.), use searchable single select
  return (
    <SearchableSelect
      options={tags.map((tag) => ({
        value: isNameField ? tag.name : String(tag.id),
        label: tag.value ? `${tag.name}: ${tag.value}` : tag.name,
      }))}
      value={value ? String(value) : ''}
      onChange={(val) => onChange(isNameField ? val : val ? Number(val) : undefined)}
      placeholder="Select tag..."
      className="w-full"
    />
  );
}

/**
 * Server Select Component
 * Handles both single select (eq, ne) and multi-select (in, notIn) for server fields
 */
function ServerSelect({
  value,
  onChange,
  operator,
  fieldKey,
}: {
  value: any;
  onChange: (value: any) => void;
  operator: string;
  fieldKey?: string;
}) {
  // Fetch all servers
  const { data: serversData, isLoading, error } = useQuery({
    queryKey: ['servers', 'all'],
    queryFn: async () => {
      try {
        const result = await getServers();
        // getServers returns ServersResponse with data array
        return Array.isArray(result?.data) ? result.data : [];
      } catch (err) {
        console.error('Error fetching servers:', err);
        return [];
      }
    },
  });

  // Ensure servers is always an array
  const servers = Array.isArray(serversData) ? serversData : [];

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded">
        Loading servers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2 text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 rounded">
        Error loading servers
      </div>
    );
  }

  // Determine if this is a name field (returns names) or ID field (returns IDs)
  const isNameField = fieldKey?.includes('.name') || fieldKey === 'servers.name';

  // For 'in' and 'notIn' operators, use multi-select
  if (operator === 'in' || operator === 'notIn') {
    // Convert servers to SearchableMultiSelect format
    const options = servers.map((server) => ({
      id: server.id,
      name: `${server.name}${server.publicIp ? ` (${server.publicIp})` : ''}`,
    }));

    // Determine selected IDs based on field type
    let selectedIds: number[] = [];
    if (isNameField) {
      // For name fields, value is an array of server names
      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
      selectedIds = selectedNames
        .map((name: string) => {
          const server = servers.find((s) => s.name === name);
          return server?.id;
        })
        .filter((id): id is number => id !== undefined);
    } else {
      // For ID fields, value is an array of server IDs
      selectedIds = Array.isArray(value)
        ? value.map((v) => Number(v)).filter((id) => !isNaN(id))
        : value
        ? [Number(value)].filter((id) => !isNaN(id))
        : [];
    }

    return (
      <div className="w-full min-w-0">
        <SearchableMultiSelect
          options={options}
          selectedIds={selectedIds}
          onChange={(selectedIds) => {
            if (isNameField) {
              // Return server names for name fields
              const selectedServers = selectedIds
                .map((id) => servers.find((s) => s.id === id))
                .filter((s): s is typeof servers[0] => s !== undefined);
              onChange(selectedServers.map((s) => s.name));
            } else {
              // Return server IDs for ID fields
              onChange(selectedIds);
            }
          }}
          placeholder="Select servers..."
          className="w-full"
        />
      </div>
    );
  }

  // For other operators (eq, ne, etc.), use searchable single select
  return (
    <SearchableSelect
      options={servers.map((server) => ({
        value: isNameField ? server.name : String(server.id),
        label: `${server.name}${server.publicIp ? ` (${server.publicIp})` : ''}`,
      }))}
      value={value ? String(value) : ''}
      onChange={(val) => onChange(isNameField ? val : val ? Number(val) : undefined)}
      placeholder="Select server..."
      className="w-full"
    />
  );
}

/**
 * ID Multi-Select Component
 * Handles multi-select for ID field with 'in' or 'notIn' operators
 */
function IdMultiSelect({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
  const [inputValue, setInputValue] = useState('');
  const [ids, setIds] = useState<number[]>(selectedIds.map((v) => Number(v)).filter((id) => !isNaN(id)));

  useEffect(() => {
    const newIds = Array.isArray(value) ? value.map((v) => Number(v)).filter((id) => !isNaN(id)) : value ? [Number(value)].filter((id) => !isNaN(id)) : [];
    setIds(newIds);
  }, [value]);

  const handleAddId = () => {
    const numValue = Number(inputValue.trim());
    if (!isNaN(numValue) && numValue > 0 && !ids.includes(numValue)) {
      const newIds = [...ids, numValue];
      setIds(newIds);
      onChange(newIds);
      setInputValue('');
    }
  };

  const canAdd = inputValue.trim() !== '' && !isNaN(Number(inputValue.trim())) && Number(inputValue.trim()) > 0 && !ids.includes(Number(inputValue.trim()));

  const handleRemoveId = (idToRemove: number) => {
    const newIds = ids.filter((id) => id !== idToRemove);
    setIds(newIds);
    onChange(newIds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddId();
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex gap-1.5 items-center">
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter ID..."
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
        />
        <button
          type="button"
          onClick={handleAddId}
          disabled={!canAdd}
          className="flex items-center justify-center px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors border border-gray-200 dark:border-gray-700/50 flex-shrink-0"
          title="Add ID"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5 min-w-0 mt-2">
          {ids.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded border border-primary/20"
            >
              {id}
              <button
                type="button"
                onClick={() => handleRemoveId(id)}
                className="text-primary hover:text-primary/70 dark:hover:text-primary/80 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded"
                aria-label={`Remove ID ${id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Generic Multi-Select Component
 * Handles multi-select for STRING and other field types with 'in' or 'notIn' operators
 */
function GenericMultiSelect({
  value,
  onChange,
  fieldType,
  placeholder = 'Enter values...',
}: {
  value: any;
  onChange: (value: any) => void;
  fieldType?: string;
  placeholder?: string;
}) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const [inputValue, setInputValue] = useState('');
  const [values, setValues] = useState<string[]>(selectedValues.map((v) => String(v)));

  useEffect(() => {
    const newValues = Array.isArray(value) ? value.map((v) => String(v)) : value ? [String(value)] : [];
    setValues(newValues);
  }, [value]);

  const handleAddValue = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue !== '' && !values.includes(trimmedValue)) {
      const newValues = [...values, trimmedValue];
      setValues(newValues);
      onChange(newValues);
      setInputValue('');
    }
  };

  const canAdd = inputValue.trim() !== '' && !values.includes(inputValue.trim());

  const handleRemoveValue = (valueToRemove: string) => {
    const newValues = values.filter((v) => v !== valueToRemove);
    setValues(newValues);
    onChange(newValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
        />
        <button
          type="button"
          onClick={handleAddValue}
          disabled={!canAdd}
          className="flex items-center justify-center px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors border border-gray-200 dark:border-gray-700/50 flex-shrink-0"
          title="Add value"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 min-w-0 mt-2">
          {values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded border border-primary/20"
            >
              <span className="truncate max-w-[200px]">{val}</span>
              <button
                type="button"
                onClick={() => handleRemoveValue(val)}
                className="hover:text-primary/80 focus:outline-none flex-shrink-0"
                aria-label={`Remove ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
