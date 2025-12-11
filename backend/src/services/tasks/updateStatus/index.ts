import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import {
  validateStatusTransition,
  hasUnresolvedDependencies,
  areAllSubtasksCompleted,
} from '../../../utils/taskValidation';

const prisma = new PrismaClient();

const statusOrder: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  in_review: 2,
  testing: 3,
  completed: 4,
};

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

  const isCompleting = data.status === 'completed';
  const isBlocked = data.status === 'blocked';
  const isInReview = data.status === 'in_review';
  const isTesting = data.status === 'testing';
  const isPaused = data.status === 'paused';
  const isResumingFromPause = task.status === 'paused' && data.status === 'in_progress';
  const requiresAttentionUser = isBlocked || isInReview;
  const completionReason = isCompleting
    ? (data.testingSkipReason || '').trim()
    : '';
  const statusReason = (data.statusReason || '').trim();

  const currentOrder = statusOrder[task.status];
  const targetOrder = statusOrder[data.status];
  const isBackward =
    currentOrder !== undefined &&
    targetOrder !== undefined &&
    targetOrder < currentOrder;

  // Only the assigned tester can complete when one is set
  if (isCompleting && task.testerId && task.testerId !== userId) {
    throw new Error('Only the assigned tester can mark this task as completed');
  }

  // Require a reason when completing without an assigned tester
  const requireTestingReason = isCompleting && !task.testerId;
  if (requireTestingReason && !completionReason) {
    throw new Error('Provide a completion reason when no tester is assigned');
  }

  if (requiresAttentionUser && !data.attentionToId) {
    throw new Error('Select a user to notify for blocked or review status');
  }

  if (!isResumingFromPause && (isBackward || isBlocked || isPaused) && !statusReason) {
    throw new Error('Reason is required when moving status backward, blocking, or pausing a task');
  }

  // Validate status transition
  const validation = validateStatusTransition(task.status, data.status, {
    assignedTo: task.assignedTo,
    testerId: data.testerId || task.testerId,
    testingSkipped: data.testingSkipped || requireTestingReason,
    testingSkipReason: completionReason || data.testingSkipReason || null,
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

  // Set tester if provided (esp. when moving to testing)
  if (data.testerId) {
    updateData.testerId = data.testerId;
    updateData.testerAssignedAt = new Date();
  }

  if (data.status === 'completed') {
    updateData.completedBy = userId;
    updateData.completedAt = new Date();
    if (requireTestingReason || data.testingSkipped) {
      updateData.testingSkipped = true;
      updateData.testingSkipReason = completionReason || data.testingSkipReason;
    }
    updateData.attentionToId = null;
  } else if (requiresAttentionUser) {
    updateData.attentionToId = data.attentionToId;
  } else {
    updateData.attentionToId = null;
  }

  const updatedTask = await prisma.task.update({
    where: { id: data.taskId },
    data: updateData,
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
      attentionToUser: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true } },
    } as any,
  } as any);

  // Persist reason as a comment for audit/communication
  if (statusReason) {
    const attentionUserDisplay = (updatedTask as any).attentionToUser
      ? (updatedTask as any).attentionToUser.name || (updatedTask as any).attentionToUser.email
      : null;
    const reasonComment = [
      `Status changed from ${task.status} to ${data.status}.`,
      statusReason ? `Reason: ${statusReason}` : '',
      attentionUserDisplay ? `Attention: ${attentionUserDisplay}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    await prisma.taskComment.create({
      data: {
        taskId: data.taskId,
        content: reasonComment,
        createdBy: userId,
      },
    });
  }

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
