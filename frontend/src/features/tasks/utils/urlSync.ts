/**
 * URL synchronization utilities for filters
 */

import type { Filter, OrderByItem, GroupByItem } from '../../release-notes/types/filters';
import { hasActiveFilters } from '../../release-notes/utils/filterState';

/**
 * Serialize filter to URL params
 */
export function serializeFiltersToUrl(
  filters?: Filter,
  search?: string,
  orderBy?: OrderByItem | OrderByItem[],
  groupBy?: GroupByItem[]
): URLSearchParams {
  const params = new URLSearchParams();
  
  if (search) {
    params.set('search', search);
  }
  
  if (filters && hasActiveFilters(filters)) {
    params.set('filters', JSON.stringify(filters));
  }
  
  if (orderBy) {
    if (Array.isArray(orderBy)) {
      params.set('orderBy', JSON.stringify(orderBy));
    } else {
      params.set('orderBy', JSON.stringify([orderBy]));
    }
  }
  
  if (groupBy && groupBy.length > 0) {
    params.set('groupBy', JSON.stringify(groupBy));
  }
  
  return params;
}

/**
 * Deserialize filter from URL params
 */
export function deserializeFiltersFromUrl(searchParams: URLSearchParams): {
  filters?: Filter;
  search?: string;
  orderBy?: OrderByItem | OrderByItem[];
  groupBy?: GroupByItem[];
} {
  const filtersParam = searchParams.get('filters');
  const search = searchParams.get('search') || undefined;
  const orderByParam = searchParams.get('orderBy');
  const groupByParam = searchParams.get('groupBy');
  
  let filters: Filter | undefined;
  if (filtersParam) {
    try {
      filters = JSON.parse(filtersParam);
    } catch (e) {
      console.error('Failed to parse filters from URL:', e);
    }
  }
  
  let orderBy: OrderByItem | OrderByItem[] | undefined;
  if (orderByParam) {
    try {
      orderBy = JSON.parse(orderByParam);
    } catch (e) {
      console.error('Failed to parse orderBy from URL:', e);
    }
  }
  
  let groupBy: GroupByItem[] | undefined;
  if (groupByParam) {
    try {
      groupBy = JSON.parse(groupByParam);
    } catch (e) {
      console.error('Failed to parse groupBy from URL:', e);
    }
  }
  
  return { filters, search, orderBy, groupBy };
}
