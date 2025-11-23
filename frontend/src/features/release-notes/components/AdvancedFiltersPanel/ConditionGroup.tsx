/**
 * Condition Group Component
 * Handles AND/OR/NOT condition groups with nested groups support
 */

import { X, Plus } from 'lucide-react';
import type { ConditionType } from '../../types/filters';
import { FilterRowComponent } from './FilterRow';
import type { FilterRow, ConditionGroupState } from './types';
import type { FilterFieldMetadata } from '../../types/filters';

type ConditionGroupProps = {
  group: ConditionGroupState;
  fields: FilterFieldMetadata[];
  onConditionChange: (groupId: string, condition: ConditionType) => void;
  onAddRow: (groupId: string) => void;
  onAddNestedGroup: (parentGroupId: string) => void;
  onUpdateRow: (groupId: string, rowId: string, updates: Partial<FilterRow>) => void;
  onRemoveRow: (groupId: string, rowId: string) => void;
  onUpdateNestedGroup: (parentGroupId: string, nestedGroupId: string, updates: Partial<ConditionGroupState>) => void;
  onRemoveNestedGroup: (parentGroupId: string, nestedGroupId: string) => void;
  onRemove: (groupId: string) => void;
  level?: number;
};

export function ConditionGroup({
  group,
  fields,
  onConditionChange,
  onAddRow,
  onAddNestedGroup,
  onUpdateRow,
  onRemoveRow,
  onUpdateNestedGroup,
  onRemoveNestedGroup,
  onRemove,
  level = 0,
}: ConditionGroupProps) {
  const canRemove = level > 0 || group.rows.length > 0 || group.groups.length > 0;

  return (
    <div className={`space-y-2 ${level > 0 ? 'ml-4 pl-4 border-l-2 border-gray-300 dark:border-gray-600' : ''}`}>
      {/* Condition Header */}
      <div className="flex items-center gap-2">
        <select
          value={group.condition}
          onChange={(e) => onConditionChange(group.id, e.target.value as ConditionType)}
          className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
          <option value="not">NOT</option>
        </select>
        {canRemove && (
          <button
            onClick={() => onRemove(group.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Remove condition group"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Rows */}
      <div className="space-y-2">
        {group.rows.map((row) => (
          <FilterRowComponent
            key={row.id}
            row={row}
            fields={fields}
            onUpdate={(rowId, updates) => onUpdateRow(group.id, rowId, updates)}
            onRemove={(rowId) => onRemoveRow(group.id, rowId)}
          />
        ))}
      </div>

      {/* Nested Groups */}
      {group.groups.map((nestedGroup) => (
        <ConditionGroup
          key={nestedGroup.id}
          group={nestedGroup}
          fields={fields}
          onConditionChange={onConditionChange}
          onAddRow={onAddRow}
          onAddNestedGroup={onAddNestedGroup}
          onUpdateRow={onUpdateRow}
          onRemoveRow={onRemoveRow}
          onUpdateNestedGroup={onUpdateNestedGroup}
          onRemoveNestedGroup={onRemoveNestedGroup}
          onRemove={onRemove}
          level={level + 1}
        />
      ))}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAddRow(group.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Filter
        </button>
        <button
          onClick={() => onAddNestedGroup(group.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-dashed border-gray-300 dark:border-gray-600"
        >
          <Plus className="w-4 h-4" />
          Add Group
        </button>
      </div>
    </div>
  );
}
