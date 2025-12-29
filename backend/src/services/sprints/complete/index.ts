import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

interface CompleteSprintParams {
  moveIncompleteToSprintId?: number | null; // null = backlog
}

export async function complete(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required'); // Using Error instead of AppError
  }

  const id = parseInt(context.params.id);
  const { moveIncompleteToSprintId } = context.body as CompleteSprintParams;

  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: { tasks: true },
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  if (sprint.status === 'completed') {
    throw new Error('Sprint is already completed');
  }

  // Find incomplete tasks
  const incompleteTasks = await prisma.task.findMany({
    where: {
      sprintId: id,
      status: {
        notIn: ['completed', 'duplicate', 'cancelled'],
      },
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Move incomplete tasks
    if (incompleteTasks.length > 0) {
      if (moveIncompleteToSprintId) {
        // Validate target sprint
        const targetSprint = await tx.sprint.findUnique({
          where: { id: moveIncompleteToSprintId },
        });
        if (!targetSprint || targetSprint.status === 'completed') {
          throw new Error('Target sprint not found or is completed');
        }
      }

      for (const task of incompleteTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            sprintId: moveIncompleteToSprintId || null,
          },
        });

        // Add history entry
        await tx.taskSprintHistory.create({
          data: {
            taskId: task.id,
            sprintId: moveIncompleteToSprintId || null,
            movedBy: userId,
            reason: `Sprint ${sprint.name} completed`,
          },
        });
      }
    }

    // 2. Mark sprint as completed
    const updatedSprint = await tx.sprint.update({
      where: { id },
      data: {
        status: 'completed',
        updatedBy: userId,
      },
    });

    // 3. Create audit log
    await tx.audit.create({
      data: {
        resourceType: 'sprint',
        resourceId: id.toString(),
        action: 'update',
        userId,
        changes: { status: 'completed', movedTasksCount: incompleteTasks.length },
      },
    });

    return {
      sprint: updatedSprint,
      movedTasksCount: incompleteTasks.length,
    };
  });

  return result;
}
