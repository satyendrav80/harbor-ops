import type { RequestContext } from '../../../types/common';
import { wouldCreateCircularDependency } from '../../../utils/taskValidation';
import { prisma } from '../../../dataStore';

export async function addDependency(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const taskId = parseInt(context.params.id);
  const { blockedByTaskId } = context.body;

  if (isNaN(taskId) || !blockedByTaskId) {
    throw new Error('Invalid task IDs');
  }

  const blockedBy = parseInt(blockedByTaskId);

  // Validate task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  // Validate blocked by task exists
  const blockedByTask = await prisma.task.findUnique({
    where: { id: blockedBy },
  });

  if (!blockedByTask || blockedByTask.deleted) {
    throw new Error('Blocked by task not found');
  }

  // Prevent self-dependency
  if (taskId === blockedBy) {
    throw new Error('Task cannot depend on itself');
  }

  // Check for circular dependency
  const wouldBeCircular = await wouldCreateCircularDependency(taskId, blockedBy);
  if (wouldBeCircular) {
    throw new Error('This would create a circular dependency');
  }

  // Create dependency
  const dependency = await prisma.taskDependency.create({
    data: {
      taskId,
      blockedByTaskId: blockedBy,
      createdBy: userId,
    },
    include: {
      blockedByTask: { select: { id: true, title: true, status: true } },
    },
  });

  return dependency;
}
