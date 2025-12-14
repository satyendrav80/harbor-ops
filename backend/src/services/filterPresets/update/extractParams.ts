/**
 * Parameter extraction utilities
 */

import type { RequestContext } from '../../../types/common';
import type { Filter, OrderByItem } from '../../../types/filterMetadata';

/**
 * Group by item type
 */
export type GroupByItem = {
  key: string;
  direction?: 'asc' | 'desc';
};

/**
 * Extract and validate parameters from request context
 */
export function extractParams(context: RequestContext) {
  const body = context.body || {};
  const params = context.params || {};

  const id = parseInt(params.id as string);
  const name = body.name as string | undefined;
  const filters = body.filters as Filter | undefined;
  const orderBy = body.orderBy as OrderByItem[] | undefined;
  const groupBy = body.groupBy as GroupByItem[] | undefined;
  const isShared = body.isShared as boolean | undefined;

  if (!id || isNaN(id)) {
    throw new Error('Valid preset ID is required');
  }

  return {
    id,
    name,
    filters,
    orderBy,
    groupBy,
    isShared,
  };
}

