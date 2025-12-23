import type { GroupByItem } from '../features/release-notes/types/filters';

export type GroupNode<TItem = any, TMeta = Record<string, any>> = {
  key: string;
  label: string;
  items: TItem[];
  subgroups?: GroupNode<TItem, TMeta>[];
  meta?: TMeta;
};

export type GroupRenderProps<TItem = any> = {
  group: GroupNode<TItem>;
  level: number;
  parentKey?: string;
};

export type GroupedRenderers<TItem = any> = {
  renderHeader: (props: GroupRenderProps<TItem>) => React.ReactNode;
  renderItems: (items: TItem[], props: GroupRenderProps<TItem>) => React.ReactNode;
};

/**
 * Helper to group arbitrary items based on the provided groupBy config.
 * Similar to the original task-specific implementation, but generic.
 */
export function groupItemsBy<TItem extends Record<string, any>>(
  items: TItem[],
  groupBy: GroupByItem[],
  formatLabel: (value: any) => string = defaultLabelFormatter
): GroupNode<TItem>[] {
  if (!groupBy || groupBy.length === 0) {
    return [];
  }

  const getValueByPath = (item: TItem, path: string): any => {
    const parts = path.split('.');
    let value: any = item;
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    return value;
  };

  const groupRecursive = (currentItems: TItem[], level: number): GroupNode<TItem>[] => {
    if (level >= groupBy.length) {
      return [];
    }

    const currentGroupBy = groupBy[level];
    const groups = new Map<string, TItem[]>();

    currentItems.forEach((item) => {
      const value = getValueByPath(item, currentGroupBy.key);
      const groupKey =
        value === null || value === undefined || value === '' ? '__null__' : String(value);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === '__null__') return 1;
      if (b === '__null__') return -1;
      const direction = currentGroupBy.direction || 'asc';
      return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedKeys.map((groupKey) => {
      const groupItems = groups.get(groupKey)!;
      const firstItem = groupItems[0];
      const value = getValueByPath(firstItem, currentGroupBy.key);
      const groupLabel = formatLabel(value);
      const subgroups =
        level < groupBy.length - 1 ? groupRecursive(groupItems, level + 1) : undefined;

      return {
        key: groupKey,
        label: groupLabel,
        items: subgroups ? [] : groupItems,
        subgroups,
      };
    });
  };

  return groupRecursive(items, 0);
}

function defaultLabelFormatter(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '(Unassigned)';
  }

  if (typeof value === 'object') {
    return value?.name || value?.title || value?.email || String(value);
  }

  return String(value);
}


