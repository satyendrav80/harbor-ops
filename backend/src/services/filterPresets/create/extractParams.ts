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

  const pageId = body.pageId as string;
  const name = body.name as string;
  const filters = body.filters as Filter | undefined;
  const orderBy = body.orderBy as OrderByItem[] | undefined;
  const groupBy = body.groupBy as GroupByItem[] | undefined;
  const isShared = body.isShared as boolean | undefined;

  if (!pageId || !name) {
    throw new Error('pageId and name are required');
  }

  return {
    pageId,
    name,
    filters,
    orderBy,
    groupBy,
    isShared: isShared || false,
  };
}

