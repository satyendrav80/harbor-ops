/**
 * List Service
 * 
 * This index file exports the main list function.
 * All sub-functions are implemented in their own module files.
 */

import type { RequestContext, ListResult } from '../../../types/common';
import { extractParams } from './extractParams';
import { prisma } from '../../../dataStore';

/**
 * List filter presets for the current user
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns List of filter presets
 */
export async function list(context: RequestContext): Promise<ListResult> {
  const { pageId } = extractParams(context);
  const userId = context.headers?.['x-user-id'] as string;

  if (!userId) {
    throw new Error('User ID is required');
  }

  // Build where clause
  const where: any = {
    userId,
  };

  if (pageId) {
    where.pageId = pageId;
  }

  // Execute database query
  const items = await prisma.filterPreset.findMany({
    where,
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return {
    data: items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
}

