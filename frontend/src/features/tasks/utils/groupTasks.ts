/**
 * Task grouping utilities
 * Groups tasks by specified field keys (supports nested grouping)
 */

import type { Task } from '../../../services/tasks';
import type { GroupByItem } from '../../release-notes/types/filters';

export type GroupedTask = {
  groupKey: string;
  groupLabel: string;
  items: Task[];
  subgroups?: GroupedTask[];
};

/**
 * Get value from task by dot-path key (e.g., "assignedToUser.name")
 */
function getValueByPath(task: Task, path: string): any {
  const parts = path.split('.');
  let value: any = task;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return null;
    }
    value = value[part];
  }
  
  return value;
}

/**
 * Format group label from value
 */
function formatGroupLabel(value: any, fieldKey: string): string {
  if (value === null || value === undefined || value === '') {
    return '(Unassigned)';
  }
  
  // If it's an object with name/email, prefer name
  if (typeof value === 'object' && value !== null) {
    return value.name || value.email || value.title || String(value);
  }
  
  return String(value);
}

/**
 * Group tasks by specified groupBy configuration
 */
export function groupTasks(tasks: Task[], groupBy: GroupByItem[]): GroupedTask[] {
  if (!groupBy || groupBy.length === 0) {
    return [];
  }

  // Build nested grouping structure
  function groupRecursive(items: Task[], level: number): GroupedTask[] {
    if (level >= groupBy.length) {
      return [];
    }

    const currentGroupBy = groupBy[level];
    const groups = new Map<string, Task[]>();

    // Group items by current level
    items.forEach(task => {
      const value = getValueByPath(task, currentGroupBy.key);
      const groupKey = value === null || value === undefined || value === '' 
        ? '__null__' 
        : String(value);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(task);
    });

    // Convert to GroupedTask array
    const result: GroupedTask[] = [];
    
    // Sort groups by key (respecting direction)
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === '__null__') return 1;
      if (b === '__null__') return -1;
      const direction = currentGroupBy.direction || 'asc';
      return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });

    sortedKeys.forEach(groupKey => {
      const groupItems = groups.get(groupKey)!;
      const firstItem = groupItems[0];
      const value = getValueByPath(firstItem, currentGroupBy.key);
      const groupLabel = formatGroupLabel(value, currentGroupBy.key);

      // Recursively group subgroups
      const subgroups = level < groupBy.length - 1 
        ? groupRecursive(groupItems, level + 1)
        : undefined;

      result.push({
        groupKey,
        groupLabel,
        items: subgroups ? [] : groupItems, // Only include items at leaf level
        subgroups,
      });
    });

    return result;
  }

  return groupRecursive(tasks, 0);
}

