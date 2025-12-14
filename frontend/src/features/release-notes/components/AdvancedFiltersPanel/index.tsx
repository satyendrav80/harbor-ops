/**
 * Advanced Filters Panel Component
 * Jira-style side panel for advanced filtering with nested condition groups
 */

import { useState, useEffect } from 'react';
import { Plus, Filter as FilterIcon } from 'lucide-react';
import { SidePanel } from '../../../../components/common/SidePanel';
import { ConditionGroup } from './ConditionGroup';
import { FilterPresets } from './FilterPresets';
import { GroupByBuilder, SortByBuilder } from '../../../../components/common/advancedQuery';
import type { FilterRow, ConditionGroupState } from './types';
import type { FilterFieldMetadata, Filter, ConditionType, OrderByItem, GroupByItem } from '../../types/filters';
import { createFilterGroup, createFilterCondition, hasActiveFilters } from '../../utils/filterState';

type AdvancedFiltersPanelProps = {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
  fields: FilterFieldMetadata[];
  filters?: Filter;
  orderBy?: OrderByItem | OrderByItem[];
  groupBy?: GroupByItem[];
  onApply: (filters: Filter | undefined, orderBy?: OrderByItem[], groupBy?: GroupByItem[]) => void;
  onClear: () => void;
};

export function AdvancedFiltersPanel({
  pageId,
  isOpen,
  onClose,
  fields,
  filters,
  orderBy: initialOrderBy,
  groupBy: initialGroupBy,
  onApply,
  onClear,
}: AdvancedFiltersPanelProps) {
  const [rootGroups, setRootGroups] = useState<ConditionGroupState[]>([
    { id: 'group-0', condition: 'and', rows: [], groups: [] },
  ]);
  const [orderBy, setOrderBy] = useState<OrderByItem[]>(
    Array.isArray(initialOrderBy) ? initialOrderBy : initialOrderBy ? [initialOrderBy] : []
  );
  const [groupBy, setGroupBy] = useState<GroupByItem[]>(initialGroupBy || []);

  // Initialize from filters
  useEffect(() => {
    if (filters && hasActiveFilters(filters)) {
      const groups = extractGroups(filters, fields);
      if (groups.length > 0) {
        setRootGroups(groups);
      }
    } else {
      setRootGroups([{ id: 'group-0', condition: 'and', rows: [], groups: [] }]);
    }
  }, [filters, fields]);

  // Initialize from orderBy and groupBy
  useEffect(() => {
    if (initialOrderBy) {
      setOrderBy(Array.isArray(initialOrderBy) ? initialOrderBy : [initialOrderBy]);
    } else {
      setOrderBy([]);
    }
  }, [initialOrderBy]);

  useEffect(() => {
    setGroupBy(initialGroupBy || []);
  }, [initialGroupBy]);

  const handleAddRow = (groupId: string) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, groupId, (group) => ({
        ...group,
        rows: [
          ...group.rows,
          {
            id: `filter-${Date.now()}`,
            fieldKey: fields[0]?.key || '',
            operator: fields[0]?.operators[0] || 'eq',
            value: undefined,
            fieldMetadata: fields[0],
          },
        ],
      }))
    );
  };

  const handleAddNestedGroup = (parentGroupId: string) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, parentGroupId, (group) => ({
        ...group,
        groups: [
          ...group.groups,
          { id: `group-${Date.now()}`, condition: 'and', rows: [], groups: [] },
        ],
      }))
    );
  };

  const handleUpdateRow = (groupId: string, rowId: string, updates: Partial<FilterRow>) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, groupId, (group) => ({
        ...group,
        rows: group.rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
      }))
    );
  };

  const handleRemoveRow = (groupId: string, rowId: string) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, groupId, (group) => ({
        ...group,
        rows: group.rows.filter((row) => row.id !== rowId),
      }))
    );
  };

  const handleConditionChange = (groupId: string, condition: ConditionType) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, groupId, (group) => ({
        ...group,
        condition,
      }))
    );
  };

  const handleUpdateNestedGroup = (
    parentGroupId: string,
    nestedGroupId: string,
    updates: Partial<ConditionGroupState>
  ) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, parentGroupId, (group) => ({
        ...group,
        groups: group.groups.map((g) =>
          g.id === nestedGroupId ? { ...g, ...updates } : g
        ),
      }))
    );
  };

  const handleRemoveNestedGroup = (parentGroupId: string, nestedGroupId: string) => {
    setRootGroups(
      updateGroupRecursive(rootGroups, parentGroupId, (group) => ({
        ...group,
        groups: group.groups.filter((g) => g.id !== nestedGroupId),
      }))
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    // Check if it's a root group
    const isRootGroup = rootGroups.some((g) => g.id === groupId);
    
    if (isRootGroup) {
      // Remove root group
      if (rootGroups.length > 1) {
        setRootGroups(rootGroups.filter((group) => group.id !== groupId));
      } else {
        // If it's the last root group, just clear it
        setRootGroups([{ id: 'group-0', condition: 'and', rows: [], groups: [] }]);
      }
    } else {
      // It's a nested group - find and remove it recursively
      setRootGroups(removeGroupRecursive(rootGroups, groupId));
    }
  };

  // Helper function to recursively remove a nested group
  function removeGroupRecursive(
    groups: ConditionGroupState[],
    targetId: string
  ): ConditionGroupState[] {
    return groups.map((group) => {
      // Check if this group contains the target group
      const hasTargetGroup = group.groups.some((g) => g.id === targetId);
      
      if (hasTargetGroup) {
        // Remove the target group from this group's nested groups
        return {
          ...group,
          groups: group.groups.filter((g) => g.id !== targetId),
        };
      }
      
      // Recursively check nested groups
      if (group.groups.length > 0) {
        return {
          ...group,
          groups: removeGroupRecursive(group.groups, targetId),
        };
      }
      
      return group;
    });
  }

  const handleApply = () => {
    const allFilters = rootGroups
      .map((group) => buildFilterFromGroup(group, fields))
      .filter((f): f is Filter => f !== null);

    const finalFilters = allFilters.length === 0 
      ? undefined 
      : allFilters.length === 1 
        ? allFilters[0] 
        : { condition: 'and' as const, childs: allFilters };
    
    const finalOrderBy = orderBy.length > 0 ? orderBy : undefined;
    const finalGroupBy = groupBy.length > 0 ? groupBy : undefined;
    
    onApply(finalFilters, finalOrderBy, finalGroupBy);
    onClose();
  };

  const handleClear = () => {
    setRootGroups([{ id: 'group-0', condition: 'and', rows: [], groups: [] }]);
    setOrderBy([]);
    setGroupBy([]);
    onClear();
    // Don't close the panel - let user apply new filters
  };

  const hasFilters = rootGroups.some((group) => hasGroupFilters(group));

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Filters"
      width="2xl"
    >
      <div className="space-y-4">
        {/* Filter Presets */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700/50">
          <FilterPresets
            pageId={pageId}
            currentFilters={(() => {
              const allFilters = rootGroups
                .map((group) => buildFilterFromGroup(group, fields))
                .filter((f): f is Filter => f !== null);
              if (allFilters.length === 0) return undefined;
              if (allFilters.length === 1) return allFilters[0];
              return { condition: 'and', childs: allFilters };
            })()}
            currentOrderBy={orderBy.length > 0 ? orderBy : undefined}
            currentGroupBy={groupBy.length > 0 ? groupBy : undefined}
            onLoadPreset={(loadedFilters, loadedOrderBy, loadedGroupBy) => {
              if (loadedFilters && hasActiveFilters(loadedFilters)) {
                const groups = extractGroups(loadedFilters, fields);
                if (groups.length > 0) {
                  setRootGroups(groups);
                }
              } else {
                setRootGroups([{ id: 'group-0', condition: 'and', rows: [], groups: [] }]);
              }
              if (loadedOrderBy) {
                setOrderBy(Array.isArray(loadedOrderBy) ? loadedOrderBy : [loadedOrderBy]);
              } else {
                setOrderBy([]);
              }
              if (loadedGroupBy) {
                setGroupBy(loadedGroupBy);
              } else {
                setGroupBy([]);
              }
            }}
          />
        </div>

        {/* Root Condition Groups (Filters) - Now on top */}
        <div className="space-y-4">
          {rootGroups.every((g) => g.rows.length === 0 && g.groups.length === 0) ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FilterIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No filters applied</p>
              <p className="text-xs mt-1">Add a filter to get started</p>
            </div>
          ) : (
            rootGroups.map((group) => (
              <ConditionGroup
                key={group.id}
                group={group}
                fields={fields}
                onConditionChange={handleConditionChange}
                onAddRow={handleAddRow}
                onAddNestedGroup={handleAddNestedGroup}
                onUpdateRow={handleUpdateRow}
                onRemoveRow={handleRemoveRow}
                onUpdateNestedGroup={handleUpdateNestedGroup}
                onRemoveNestedGroup={handleRemoveNestedGroup}
                onRemove={handleRemoveGroup}
                level={0}
              />
            ))
          )}

          {/* Add Filter Button (for first group if empty) */}
          {rootGroups[0]?.rows.length === 0 && rootGroups[0]?.groups.length === 0 && (
            <button
              onClick={() => handleAddRow(rootGroups[0].id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Filter
            </button>
          )}
        </div>

        {/* Group By Builder */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700/50">
          <GroupByBuilder
            fields={fields}
            value={groupBy}
            onChange={setGroupBy}
          />
        </div>

        {/* Sort By Builder */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700/50">
          <SortByBuilder
            fields={fields}
            value={orderBy}
            onChange={setOrderBy}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            disabled={!hasFilters && orderBy.length === 0 && groupBy.length === 0}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </SidePanel>
  );
}

// Helper function to recursively update a group (returns new array)
function updateGroupRecursive(
  groups: ConditionGroupState[],
  targetId: string,
  updater: (group: ConditionGroupState) => ConditionGroupState
): ConditionGroupState[] {
  return groups.map((group) => {
    if (group.id === targetId) {
      return updater(group);
    }
    if (group.groups.length > 0) {
      return {
        ...group,
        groups: updateGroupRecursive(group.groups, targetId, updater),
      };
    }
    return group;
  });
}

// Helper function to check if a group has any filters
function hasGroupFilters(group: ConditionGroupState): boolean {
  if (group.rows.some((row) => row.fieldKey && row.operator && row.value !== undefined)) {
    return true;
  }
  return group.groups.some((g) => hasGroupFilters(g));
}

// Build filter structure from group state
function buildFilterFromGroup(
  group: ConditionGroupState,
  fields: FilterFieldMetadata[]
): Filter | null {
  const conditions: any[] = [];

  // Add filter rows
  group.rows
    .filter((row) => row.fieldKey && row.operator)
    .forEach((row) => {
      const field = fields.find((f) => f.key === row.fieldKey);
      if (field) {
        conditions.push(
          createFilterCondition(row.fieldKey, field.type, row.operator, row.value)
        );
      }
    });

  // Add nested groups
  group.groups.forEach((nestedGroup) => {
    const nestedFilter = buildFilterFromGroup(nestedGroup, fields);
    if (nestedFilter) {
      conditions.push(nestedFilter);
    }
  });

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return { condition: group.condition, childs: conditions };
}

// Extract groups from filter structure
function extractGroups(filter: Filter, fields: FilterFieldMetadata[]): ConditionGroupState[] {
  if ('key' in filter) {
    // Single condition
    return [
      {
        id: 'group-0',
        condition: 'and',
        rows: [
          {
            id: 'filter-0',
            fieldKey: filter.key,
            operator: filter.operator,
            value: filter.value,
            fieldMetadata: fields.find((f) => f.key === filter.key),
          },
        ],
        groups: [],
      },
    ];
  }

  // It's a group - extract recursively
  function extractGroup(node: Filter, groupId: string): ConditionGroupState {
    if ('key' in node) {
      // Leaf condition - shouldn't happen at group level
      return {
        id: groupId,
        condition: 'and',
        rows: [
          {
            id: `filter-${Date.now()}`,
            fieldKey: node.key,
            operator: node.operator,
            value: node.value,
            fieldMetadata: fields.find((f) => f.key === node.key),
          },
        ],
        groups: [],
      };
    }

    const rows: FilterRow[] = [];
    const nestedGroups: ConditionGroupState[] = [];
    let nestedId = 0;

    node.childs.forEach((child) => {
      if ('key' in child) {
        // It's a condition
        rows.push({
          id: `filter-${Date.now()}-${rows.length}`,
          fieldKey: child.key,
          operator: child.operator,
          value: child.value,
          fieldMetadata: fields.find((f) => f.key === child.key),
        });
      } else {
        // It's a nested group
        nestedGroups.push(extractGroup(child, `${groupId}-nested-${nestedId++}`));
      }
    });

    return {
      id: groupId,
      condition: node.condition,
      rows,
      groups: nestedGroups,
    };
  }

  return [extractGroup(filter, 'group-0')];
}
