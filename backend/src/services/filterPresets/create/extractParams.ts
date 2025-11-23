/**
 * Parameter extraction utilities
 */

import type { RequestContext } from '../../../types/common';
import type { Filter } from '../../../types/filterMetadata';

/**
 * Extract and validate parameters from request context
 */
export function extractParams(context: RequestContext) {
  const body = context.body || {};

  const pageId = body.pageId as string;
  const name = body.name as string;
  const filters = body.filters as Filter | undefined;
  const isShared = body.isShared as boolean | undefined;

  if (!pageId || !name) {
    throw new Error('pageId and name are required');
  }

  return {
    pageId,
    name,
    filters,
    isShared: isShared || false,
  };
}

