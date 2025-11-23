/**
 * Create Service
 * 
 * This index file exports the main create function.
 * All sub-functions are implemented in their own module files.
 */

import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';

const prisma = new PrismaClient();

/**
 * Create a new filter preset
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns Created filter preset
 */
export async function create(context: RequestContext) {
  const { pageId, name, filters, isShared } = extractParams(context);
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
      isShared,
    },
  });

  return preset;
}

