/**
 * Parameter extraction utilities
 */

import type { RequestContext } from '../../../types/common';

/**
 * Extract and validate parameters from request context
 */
export function extractParams(context: RequestContext) {
  const query = context.query || {};
  const pageId = query.pageId as string | undefined;

  return {
    pageId,
  };
}

