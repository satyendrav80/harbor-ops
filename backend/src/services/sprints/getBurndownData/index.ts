import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { generateBurndownData } from '../../../utils/sprintAnalytics';

const prisma = new PrismaClient();

export async function getBurndownData(context: RequestContext) {
  const sprintId = parseInt(context.params.id);
  if (isNaN(sprintId)) {
    throw new Error('Invalid sprint ID');
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
  });

  if (!sprint || sprint.deleted) {
    throw new Error('Sprint not found');
  }

  const data = await generateBurndownData(sprintId);
  return data;
}
