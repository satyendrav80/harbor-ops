/**
 * Parameter extraction utilities
 */

import type { RequestContext } from '../../../types/common';
import type { Filter, OrderByItem, GroupByItem } from '../../../types/filterMetadata';

/**
 * Extract and validate parameters from request context
 */
export function extractParams(context: RequestContext) {
  const body = context.body || {};
  const query = context.query || {};

  // Extract from body (POST request)
  // Support both new nested structure and legacy flat array
  const filters: Filter | Filter[] = body.filters || [];
  const search = body.search?.trim() || undefined;
  const page = Math.max(1, parseInt(body.page) || parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(body.limit) || parseInt(query.limit) || 20)); // Limit max to 1000
  
  // Support both new array format and legacy single object format for orderBy
  const orderBy = body.orderBy || { key: 'createdAt', direction: 'desc' as const };
  const groupBy = normalizeGroupBy(body.groupBy);

  return {
    filters,
    search,
    page,
    limit,
    orderBy,
    groupBy,
  };
}

function normalizeGroupBy(rawGroupBy: any): GroupByItem[] | undefined {
  if (!rawGroupBy) return undefined;
  if (!Array.isArray(rawGroupBy)) {
    if (typeof rawGroupBy === 'object' && rawGroupBy !== null && typeof rawGroupBy.key === 'string') {
      return [{ key: rawGroupBy.key, direction: rawGroupBy.direction }];
    }
    return undefined;
  }

  const normalized = rawGroupBy
    .filter((item) => item && typeof item === 'object' && typeof item.key === 'string')
    .map((item) => ({
      key: item.key,
      direction: item.direction === 'desc' ? 'desc' : 'asc',
    })) as GroupByItem[];

  return normalized.length > 0 ? normalized : undefined;
}

