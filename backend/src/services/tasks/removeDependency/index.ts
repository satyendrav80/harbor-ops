import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

export async function removeDependency(context: RequestContext) {
  const taskId = parseInt(context.params.id);
  const dependencyId = parseInt(context.params.dependencyId);

  if (isNaN(taskId) || isNaN(dependencyId)) {
    throw new Error('Invalid IDs');
  }

  const dependency = await prisma.taskDependency.findUnique({
    where: { id: dependencyId },
  });

  if (!dependency || dependency.taskId !== taskId) {
    throw new Error('Dependency not found');
  }

  await prisma.taskDependency.delete({
    where: { id: dependencyId },
  });

  return { success: true };
}
