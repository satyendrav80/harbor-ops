import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

export async function deleteTask(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const taskId = parseInt(context.params.id);
  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  // Soft delete task and all subtasks
  await prisma.task.updateMany({
    where: {
      OR: [{ id: taskId }, { parentTaskId: taskId }],
    },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });

  // Create audit log
  await prisma.audit.create({
    data: {
      resourceType: 'task',
      resourceId: taskId.toString(),
      action: 'delete',
      userId,
    },
  });

  return { success: true };
}
