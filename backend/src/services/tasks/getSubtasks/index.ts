import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';

const prisma = new PrismaClient();

export async function getSubtasks(context: RequestContext) {
  const parentTaskId = parseInt(context.params.id);

  if (isNaN(parentTaskId)) {
    throw new Error('Invalid parent task ID');
  }

  const subtasks = await prisma.task.findMany({
    where: {
      parentTaskId,
      deleted: false,
    },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return subtasks;
}
