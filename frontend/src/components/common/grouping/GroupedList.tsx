import React, { useEffect, useMemo, useState } from 'react';
import type { GroupByItem } from '../../../features/release-notes/types/filters';
import type { GroupNode, GroupRenderProps } from '../../../types/grouping';
import { groupItemsBy } from '../../../types/grouping';

export type GroupedListProps<TItem extends Record<string, any>> = {
  items: TItem[];
  groupBy?: GroupByItem[];
  groups?: GroupNode<TItem, any>[];
  groupLabelFormatter?: (value: any) => string;
  renderHeader: (props: GroupRenderProps<TItem> & RenderStateProps) => React.ReactNode;
  renderItems: (items: TItem[], props: GroupRenderProps<TItem> & RenderStateProps) => React.ReactNode;
  renderContainer?: (children: React.ReactNode) => React.ReactNode;
  collapsible?: boolean;
  collapseLeaves?: boolean;
  defaultExpanded?: 'all' | 'none';
  className?: string;
};

type RenderStateProps = {
  isExpanded: boolean;
  toggle: () => void;
  hasChildren: boolean;
  canToggle: boolean;
};

/**
 * Generic grouped list component with optional collapsible sections.
 */
export function GroupedList<TItem extends Record<string, any>>({
  items,
  groupBy,
  groups,
  groupLabelFormatter,
  renderHeader,
  renderItems,
  renderContainer,
  collapsible = true,
  collapseLeaves = false,
  defaultExpanded = 'all',
  className,
}: GroupedListProps<TItem>) {
  const computedGroups = useMemo(() => {
    if (groups) return groups;
    if (!groupBy || groupBy.length === 0) {
      return undefined;
    }
    return groupItemsBy(items, groupBy, groupLabelFormatter);
  }, [groups, items, groupBy, groupLabelFormatter]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!computedGroups) {
      setExpanded(new Set());
      return;
    }
    if (defaultExpanded === 'all') {
      const allKeys = new Set<string>();
      const collect = (nodes: GroupNode<TItem>[], prefix = '') => {
        nodes.forEach((node) => {
          const key = prefix ? `${prefix}::${node.key}` : node.key;
          allKeys.add(key);
          if (node.subgroups) {
            collect(node.subgroups, key);
          }
        });
      };
      collect(computedGroups);
      setExpanded(allKeys);
    } else {
      setExpanded(new Set());
    }
  }, [computedGroups, defaultExpanded]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const content = !computedGroups
    ? renderItems(items, {
        group: { key: 'all', label: '', items },
        level: 0,
        parentKey: undefined,
        isExpanded: true,
        toggle: () => {},
        hasChildren: false,
        canToggle: false,
      })
    : computedGroups.map((group) => (
        <GroupedSection
          key={group.key}
          group={group}
          level={0}
          parentKey={undefined}
          renderHeader={renderHeader}
          renderItems={renderItems}
          collapsible={collapsible}
          collapseLeaves={collapseLeaves}
          expanded={expanded}
          toggle={toggle}
        />
      ));

  const renderedContent = renderContainer ? renderContainer(content) : content;

  if (className) {
    return <div className={className}>{renderedContent}</div>;
  }

  return <>{renderedContent}</>;
}

type GroupedSectionProps<TItem> = {
  group: GroupNode<TItem>;
  level: number;
  parentKey?: string;
  renderHeader: (props: GroupRenderProps<TItem> & RenderStateProps) => React.ReactNode;
  renderItems: (items: TItem[], props: GroupRenderProps<TItem> & RenderStateProps) => React.ReactNode;
  collapsible: boolean;
  collapseLeaves: boolean;
  expanded: Set<string>;
  toggle: (key: string) => void;
};

function GroupedSection<TItem>({
  group,
  level,
  parentKey,
  renderHeader,
  renderItems,
  collapsible,
  collapseLeaves,
  expanded,
  toggle,
}: GroupedSectionProps<TItem>) {
  const keyPrefix = parentKey ? `${parentKey}::${group.key}` : group.key;
  const hasChildren = Boolean(group.subgroups && group.subgroups.length > 0);
  const hasItems = Boolean(group.items && group.items.length > 0);
  const canToggle = collapsible && (hasChildren || (collapseLeaves && hasItems));
  const isExpanded = !canToggle || expanded.has(keyPrefix);
  const renderState: RenderStateProps = {
    isExpanded,
    toggle: () => {
      if (canToggle) toggle(keyPrefix);
    },
    hasChildren,
    canToggle,
  };
  const baseProps: GroupRenderProps<TItem> = { group, level, parentKey };
  return (
    <>
      {renderHeader({ ...baseProps, ...renderState })}
      {(!canToggle || renderState.isExpanded) &&
        (hasChildren
          ? group.subgroups!.map((subgroup) => (
              <GroupedSection
                key={`${keyPrefix}::${subgroup.key}`}
                group={subgroup}
                level={level + 1}
                parentKey={keyPrefix}
                renderHeader={renderHeader}
                renderItems={renderItems}
                collapsible={collapsible}
                collapseLeaves={collapseLeaves}
                expanded={expanded}
                toggle={toggle}
              />
            ))
          : renderItems(group.items, { ...baseProps, ...renderState }))}
    </>
  );
}


