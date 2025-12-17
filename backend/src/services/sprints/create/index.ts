import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { prisma } from '../../../dataStore';

export async function create(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  const sprint = await prisma.sprint.create({
    data: {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: userId,
    },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  // Create audit log
  await prisma.audit.create({
    data: {
      resourceType: 'sprint',
      resourceId: sprint.id.toString(),
      action: 'create',
      userId,
      changes: { created: sprint },
    },
  });

  return sprint;
}
