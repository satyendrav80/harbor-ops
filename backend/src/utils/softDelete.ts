import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generic soft delete function
 * Sets deleted=true, deletedAt=now(), deletedBy=userId
 */
export async function softDelete(
  model: string,
  id: number | string,
  userId?: string
): Promise<void> {
  const now = new Date();
  
  const updateData: any = {
    deleted: true,
    deletedAt: now,
    deletedBy: userId || null,
  };

  // Use dynamic model access
  const modelClient = (prisma as any)[model];
  if (!modelClient) {
    throw new Error(`Model ${model} not found`);
  }

  await modelClient.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Generic restore function
 * Sets deleted=false, deletedAt=null, deletedBy=null
 */
export async function restore(
  model: string,
  id: number | string
): Promise<void> {
  const updateData: any = {
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  };

  // Use dynamic model access
  const modelClient = (prisma as any)[model];
  if (!modelClient) {
    throw new Error(`Model ${model} not found`);
  }

  await modelClient.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Helper to add soft delete filter to Prisma where clause
 */
export function excludeDeleted(where: any = {}) {
  return {
    ...where,
    deleted: false,
  };
}

