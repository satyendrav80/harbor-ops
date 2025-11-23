/**
 * Single filter row component
 */

import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '../../../../services/services';
import { SearchableMultiSelect } from '../../../../components/common/SearchableMultiSelect';
import { SPECIAL_DATE_OPTIONS, isSpecialDateValue, type SpecialDateValue } from '../../utils/dateHelpers';
import type { FilterRow } from './types';
import type { FilterFieldMetadata } from '../../types/filters';

type FilterRowProps = {
  row: FilterRow;
  fields: FilterFieldMetadata[];
  onUpdate: (id: string, updates: Partial<FilterRow>) => void;
  onRemove: (id: string) => void;
};

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
            <select
              value={row.fieldKey}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Select */}
          <div className="min-w-0">
            <select
              value={row.operator}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {operators.map((op) => (
                <option key={op} value={op}>
                  {formatOperator(op)}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          {isValueRequired && (
            <div className="min-w-0">
              {renderValueInput(field, row.operator, row.value, handleValueChange, row.fieldKey)}
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
  fieldKey?: string
) {
  // Config-based service dropdown - check relationModel instead of hardcoded key
  if (field.relationModel === 'Service') {
    // For service.name, show dropdown only for in/notIn, text input for others
    if (fieldKey === 'service.name' && (operator === 'in' || operator === 'notIn')) {
      return <ServiceSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }
    // For serviceId, always show service dropdown
    if (fieldKey === 'serviceId') {
      return <ServiceSelect value={value} onChange={onChange} operator={operator} fieldKey={fieldKey} />;
    }
    // For service.name with contains/startsWith/endsWith/eq/ne, show text input (fall through)
  }

  // Multi-select for ID field with 'in' or 'notIn' operator
  if (fieldKey === 'id' && (operator === 'in' || operator === 'notIn')) {
    return <IdMultiSelect value={value} onChange={onChange} />;
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
              <select
                value={fromValue}
                onChange={(e) => onChange([e.target.value as SpecialDateValue, toValue])}
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {SPECIAL_DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
              <select
                value={toValue}
                onChange={(e) => onChange([fromValue, e.target.value as SpecialDateValue])}
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {SPECIAL_DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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


  // Use SearchableMultiSelect for 'in' and 'notIn' operators with enum options
  if ((operator === 'in' || operator === 'notIn') && field.ui.options) {
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    // Convert to format expected by SearchableMultiSelect: {id: number, name: string}
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

  if (field.ui.inputType === 'select' || field.ui.inputType === 'multiselect') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="">Select...</option>
        {field.ui.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
      <div className="w-full min-w-0 overflow-hidden">
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
            <select
              value={value || SPECIAL_DATE_OPTIONS[0].value}
              onChange={(e) => onChange(e.target.value as SpecialDateValue)}
              className="flex-1 min-w-0 px-2 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden"
            >
              {SPECIAL_DATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

  const services = servicesData || [];

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded">
        Loading services...
      </div>
    );
  }

  // For 'in' and 'notIn' operators, use multi-select
  if (operator === 'in' || operator === 'notIn') {
    // Convert services to SearchableMultiSelect format
    const options = services.map((service) => ({
      id: service.id,
      name: `${service.name} (${service.port})`,
    }));

    // Determine selected IDs based on field type
    let selectedIds: number[] = [];
    if (fieldKey === 'service.name') {
      // For service.name, value is an array of service names
      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
      selectedIds = selectedNames
        .map((name: string) => {
          const service = services.find((s) => s.name === name);
          return service?.id;
        })
        .filter((id): id is number => id !== undefined);
    } else {
      // For serviceId, value is an array of service IDs
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
            if (fieldKey === 'service.name') {
              // Return service names for service.name field
              const selectedServices = selectedIds
                .map((id) => services.find((s) => s.id === id))
                .filter((s): s is typeof services[0] => s !== undefined);
              onChange(selectedServices.map((s) => s.name));
            } else {
              // Return service IDs for serviceId field
              onChange(selectedIds);
            }
          }}
          placeholder="Select services..."
          className="w-full"
        />
      </div>
    );
  }

  // For other operators (eq, ne, etc.), use single select
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <option value="">Select service...</option>
      {services.map((service) => (
        <option key={service.id} value={service.id}>
          {service.name} (Port: {service.port})
        </option>
      ))}
    </select>
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
