import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import {
  validateStatusTransition,
  hasUnresolvedDependencies,
  areAllSubtasksCompleted,
} from '../../../utils/taskValidation';

const prisma = new PrismaClient();

export async function updateStatus(context: RequestContext) {
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

  // Validate status transition
  const validation = validateStatusTransition(task.status, data.status, {
    assignedTo: task.assignedTo,
    testerId: task.testerId,
    testingSkipped: data.testingSkipped,
    testingSkipReason: data.testingSkipReason || null,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check for unresolved dependencies if completing
  if (data.status === 'completed') {
    const depCheck = await hasUnresolvedDependencies(data.taskId);
    if (depCheck.hasUnresolved) {
      throw new Error(`Cannot complete task with unresolved dependencies: ${depCheck.unresolvedTasks.map(t => t.title).join(', ')}`);
    }

    // Check if all subtasks are completed
    const subtaskCheck = await areAllSubtasksCompleted(data.taskId);
    if (!subtaskCheck.allCompleted) {
      throw new Error(`Cannot complete task with incomplete subtasks: ${subtaskCheck.incompleteSubtasks.map(t => t.title).join(', ')}`);
    }
  }

  // Update task status
  const updateData: any = {
    status: data.status,
    updatedBy: userId,
  };

  if (data.status === 'completed') {
    updateData.completedBy = userId;
    updateData.completedAt = new Date();
    if (data.testingSkipped) {
      updateData.testingSkipped = true;
      updateData.testingSkipReason = data.testingSkipReason;
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: data.taskId },
    data: updateData,
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true } },
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
        field: 'status',
        before: task.status,
        after: data.status,
      },
    },
  });

  return updatedTask;
}
