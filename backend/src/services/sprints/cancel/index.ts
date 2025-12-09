import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';

const prisma = new PrismaClient();

interface CancelSprintParams {
  moveTasksToSprintId?: number | null; // null = backlog, number = target sprint
}

export async function cancel(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const id = parseInt(context.params.id);
  const { moveTasksToSprintId } = context.body as CancelSprintParams;

  const sprint = await prisma.sprint.findUnique({
    where: { id },
  });

  if (!sprint || sprint.deleted) {
    throw new Error('Sprint not found');
  }

  // Find all tasks in the sprint
  const allTasks = await prisma.task.findMany({
    where: {
      sprintId: id,
      deleted: false,
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Move all tasks
    if (allTasks.length > 0) {
      if (moveTasksToSprintId) {
        // Validate target sprint
        const targetSprint = await tx.sprint.findUnique({
          where: { id: moveTasksToSprintId },
        });
        if (!targetSprint || targetSprint.deleted || targetSprint.status === 'completed') {
          throw new Error('Target sprint not found, deleted, or completed');
        }
      }

      await tx.task.updateMany({
        where: { sprintId: id },
        data: {
          sprintId: moveTasksToSprintId || null,
        },
      });

      // Add history entry for each task
      for (const task of allTasks) {
        await tx.taskSprintHistory.create({
          data: {
            taskId: task.id,
            sprintId: moveTasksToSprintId || null,
            movedBy: userId,
            reason: `Sprint ${sprint.name} cancelled/deleted`,
          },
        });
      }
    }

    // 2. Mark sprint as deleted (Cancel)
    const updatedSprint = await tx.sprint.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        status: 'active', // Keep status but mark deleted? Or maybe we can't change status to 'cancelled' if enum doesn't allow.
        // Safest is to just soft-delete it.
      },
    });

    // 3. Create audit log
    await tx.audit.create({
      data: {
        resourceType: 'sprint',
        resourceId: id.toString(),
        action: 'delete',
        userId,
        changes: { deleted: true, movedTasksCount: allTasks.length },
      },
    });

    return {
      success: true,
      movedTasksCount: allTasks.length,
    };
  });

  return result;
}
