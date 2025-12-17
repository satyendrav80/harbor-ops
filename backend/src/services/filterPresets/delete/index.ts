/**
 * Delete Service
 * 
 * This index file exports the main delete function.
 */

import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

/**
 * Delete a filter preset
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns Success status
 */
export async function deletePreset(context: RequestContext) {
  const params = context.params || {};
  const id = parseInt(params.id as string);
  const userId = context.headers?.['x-user-id'] as string;

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!id || isNaN(id)) {
    throw new Error('Valid preset ID is required');
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

  // Delete the preset (hard delete)
  await prisma.filterPreset.delete({
    where: { id },
  });

  return { success: true };
}

