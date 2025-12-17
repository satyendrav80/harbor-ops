/**
 * Create Service
 * 
 * This index file exports the main create function.
 * All sub-functions are implemented in their own module files.
 */

import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { prisma } from '../../../dataStore';

/**
 * Create a new filter preset
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns Created filter preset
 */
export async function create(context: RequestContext) {
  const { pageId, name, filters, orderBy, groupBy, isShared } = extractParams(context);
  const userId = context.headers?.['x-user-id'] as string;

  if (!userId) {
    throw new Error('User ID is required');
  }

  // Create the preset
  const preset = await prisma.filterPreset.create({
    data: {
      userId,
      pageId,
      name,
      filters: filters ? (filters as any) : null, // Store as JSON, null if undefined
      orderBy: orderBy ? (orderBy as any) : null, // Store as JSON, null if undefined
      groupBy: groupBy ? (groupBy as any) : null, // Store as JSON, null if undefined
      isShared,
    },
  });

  return preset;
}

