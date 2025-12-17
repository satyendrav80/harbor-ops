/**
 * Update Service
 * 
 * This index file exports the main update function.
 * All sub-functions are implemented in their own module files.
 */

import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { prisma } from '../../../dataStore';

/**
 * Update an existing filter preset
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns Updated filter preset
 */
export async function update(context: RequestContext) {
  const { id, name, filters, orderBy, groupBy, isShared } = extractParams(context);
  const userId = context.headers?.['x-user-id'] as string;

  if (!userId) {
    throw new Error('User ID is required');
  }

  // Verify the preset belongs to the user
  const existing = await prisma.filterPreset.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw new Error('Filter preset not found');
  }

  // Build update data
  const updateData: any = {};
  if (name !== undefined) {
    updateData.name = name;
  }
  if (filters !== undefined) {
    updateData.filters = filters ? (filters as any) : null; // Store as JSON, null if undefined
  }
  if (orderBy !== undefined) {
    updateData.orderBy = orderBy ? (orderBy as any) : null; // Store as JSON, null if undefined
  }
  if (groupBy !== undefined) {
    updateData.groupBy = groupBy ? (groupBy as any) : null; // Store as JSON, null if undefined
  }
  if (isShared !== undefined) {
    updateData.isShared = isShared;
  }

  // Update the preset
  const preset = await prisma.filterPreset.update({
    where: { id },
    data: updateData,
  });

  return preset;
}

