import type { RequestContext } from '../../../types/common';
import { generateGanttData } from '../../../utils/sprintAnalytics';
import { prisma } from '../../../dataStore';

export async function getGanttData(context: RequestContext) {
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

  const data = await generateGanttData(sprintId);
  return data;
}
