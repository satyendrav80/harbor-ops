import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { createSprintHistoryRecord } from '../../../utils/taskValidation';

const prisma = new PrismaClient();

export async function reopen(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    include: { sprint: true },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  if (task.status !== 'completed') {
    throw new Error('Only completed tasks can be reopened');
  }

  // Increment reopen count
  const reopenCount = task.reopenCount + 1;

  // Check if sprint is completed - if so, detach from sprint
  let newSprintId = task.sprintId;
  if (task.sprint && task.sprint.status === 'completed') {
    newSprintId = null;
  }

  // Update task
  const updatedTask = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      status: 'reopened',
      reopenCount,
      lastReopenedAt: new Date(),
      lastReopenedBy: userId,
      sprintId: newSprintId,
      updatedBy: userId,
    },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      lastReopenedByUser: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true } },
    },
  });

  // Create sprint history if detached from sprint
  if (task.sprintId && !newSprintId) {
    await createSprintHistoryRecord(data.taskId, null, userId, `Task reopened: ${data.reason}`);
  }

  // Add comment with reopen reason
  await prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      content: `**Task Reopened** (Count: ${reopenCount})\n\nReason: ${data.reason}`,
      createdBy: userId,
    },
  });

  // Create audit log
  await prisma.audit.create({
    data: {
      resourceType: 'task',
      resourceId: data.taskId.toString(),
      action: 'update',
      userId,
      changes: {
        action: 'reopened',
        reopenCount,
        reason: data.reason,
      },
    },
  });

  return updatedTask;
}
