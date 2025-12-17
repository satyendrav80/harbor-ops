import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

export async function get(context: RequestContext) {
  const sprintId = parseInt(context.params.id);
  if (isNaN(sprintId)) {
    throw new Error('Invalid sprint ID');
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
      tasks: {
        where: { deleted: false },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          tester: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
          _count: {
            select: {
              subtasks: { where: { deleted: false } },
              comments: { where: { deleted: false } },
            },
          },
        },
      },
    },
  });

  if (!sprint || sprint.deleted) {
    throw new Error('Sprint not found');
  }

  // Calculate metrics
  const { calculateSprintMetrics } = await import('../../../utils/sprintAnalytics');
  const metrics = await calculateSprintMetrics(sprintId);

  return { ...sprint, metrics };
}
