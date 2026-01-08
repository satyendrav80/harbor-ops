import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import {
  validateStatusTransition,
  hasUnresolvedDependencies,
  areAllSubtasksCompleted,
} from '../../../utils/taskValidation';
import { sanitizeRichTextHtml, htmlToPlainText } from '../../../utils/richText';
import { createNotification } from '../../notifications';
import { emitTaskUpdated } from '../../../socket/socket';
import { prisma } from '../../../dataStore';

const statusOrder: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  in_review: 2,
  proceed: 2,
  testing: 3,
  not_fixed: 1,
  completed: 4,
  duplicate: 4,
  paused: 1,
  blocked: 1,
  cancelled: 0,
  reopened: 0,
};

export async function updateStatus(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  const statusReasonHtml = sanitizeRichTextHtml(data.statusReason || '');
  const statusReason = htmlToPlainText(statusReasonHtml);
  const testingSkipReasonPlain = htmlToPlainText(sanitizeRichTextHtml(data.testingSkipReason || ''));

  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    include: { sprint: true },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  const isCompleting = data.status === 'completed';
  const isDuplicate = data.status === 'duplicate';
  const isTerminalCompletion = isCompleting || isDuplicate;
  const isBlocked = data.status === 'blocked';
  const isInReview = data.status === 'in_review';
  const isProceed = data.status === 'proceed';
  const isTesting = data.status === 'testing';
  const isNotFixed = data.status === 'not_fixed';
  const isPaused = data.status === 'paused';
  const isCancelled = data.status === 'cancelled';
  const isResumingFromPause = task.status === 'paused' && data.status === 'in_progress';
  const requiresAttentionUser = isBlocked || isInReview;
  const completionReason = isCompleting ? testingSkipReasonPlain : '';

  const currentOrder = statusOrder[task.status];
  const targetOrder = statusOrder[data.status];
  const isBackward =
    currentOrder !== undefined &&
    targetOrder !== undefined &&
    targetOrder < currentOrder;

  // Only the assigned tester can complete when one is set
  if (isTerminalCompletion && task.testerId && task.testerId !== userId) {
    throw new Error('Only the assigned tester can complete or mark this task as duplicate');
  }

  // Require a reason when completing without an assigned tester
  const requireTestingReason = isCompleting && !task.testerId;
  if (requireTestingReason && !completionReason) {
    throw new Error('Provide a completion reason when no tester is assigned');
  }

  if (isProceed) {
    if (!task.attentionToId) {
      throw new Error('Task has no attention user to mark as proceed');
    }
    if (task.attentionToId !== userId) {
      throw new Error('Only the attention user can mark this task as proceed');
    }
    if (!statusReason) {
      throw new Error('Reason is required when marking proceed');
    }
  }

  if (isNotFixed) {
    if (!task.testerId) {
      throw new Error('Task has no tester assigned');
    }
    if (task.testerId !== userId) {
      throw new Error('Only the tester can mark this task as not fixed');
    }
    if (task.status !== 'testing') {
      throw new Error('Not fixed can only be set while task is in testing');
    }
    if (!statusReason) {
      throw new Error('Reason is required when marking not fixed');
    }
  }

  if (requiresAttentionUser && !data.attentionToId) {
    throw new Error('Select a user to notify for blocked or review status');
  }

  if (!isResumingFromPause && (isBackward || isBlocked || isPaused || isInReview) && !statusReason) {
    throw new Error('Reason is required when moving status backward, blocking, pausing, or sending to review');
  }

  if (isCancelled && !statusReason) {
    throw new Error('Reason is required when cancelling a task');
  }

  if (isDuplicate && !statusReason) {
    throw new Error('Reason is required when marking duplicate');
  }

  // Validate status transition
  const validation = validateStatusTransition(task.status, data.status, {
    assignedTo: task.assignedTo,
    testerId: data.testerId || task.testerId,
    testingSkipped: data.testingSkipped || requireTestingReason,
    testingSkipReason: completionReason || null,
    statusReason,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check for unresolved dependencies if completing
  if (isTerminalCompletion) {
    const depCheck = await hasUnresolvedDependencies(data.taskId);
    if (depCheck.hasUnresolved) {
      throw new Error(`Cannot close task with unresolved dependencies: ${depCheck.unresolvedTasks.map(t => t.title).join(', ')}`);
    }

    // Check if all subtasks are completed
    const subtaskCheck = await areAllSubtasksCompleted(data.taskId);
    if (!subtaskCheck.allCompleted) {
      throw new Error(`Cannot close task with incomplete subtasks: ${subtaskCheck.incompleteSubtasks.map(t => t.title).join(', ')}`);
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

  if (isTerminalCompletion) {
    updateData.completedBy = userId;
    updateData.completedAt = new Date();
    if (isCompleting && (requireTestingReason || data.testingSkipped)) {
      updateData.testingSkipped = true;
      updateData.testingSkipReason = completionReason;
    }
    updateData.attentionToId = null;
  } else if (requiresAttentionUser) {
    updateData.attentionToId = data.attentionToId;
  } else if (isProceed || isNotFixed) {
    updateData.attentionToId = null;
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
    const commentSections = [
      `<p><strong>Status changed from ${task.status} to ${data.status}.</strong></p>`,
    ];

    if (statusReasonHtml) {
      commentSections.push(`<p><strong>Reason:</strong></p>${statusReasonHtml}`);
    }

    if (attentionUserDisplay) {
      commentSections.push(`<p><strong>Attention:</strong> ${attentionUserDisplay}</p>`);
    }

    const reasonComment = commentSections.join('<br/><br/>');

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

  // Notify attention user when they are newly set
  const attentionChanged =
    requiresAttentionUser &&
    data.attentionToId &&
    data.attentionToId !== task.attentionToId &&
    data.attentionToId !== userId;
  if (attentionChanged) {
    try {
      await createNotification({
        userId: data.attentionToId,
        type: 'task_attention',
        taskId: data.taskId,
        title: 'Task needs your attention',
        message: `“${task.title}” was added to your My Tasks`,
      });
    } catch (err) {
      // ignore notification failures
    }
  }

  // Notify newly set tester when moving to testing and assigning tester
  const testerChanged = data.testerId && data.testerId !== task.testerId && data.testerId !== userId;
  if (testerChanged) {
    try {
      await createNotification({
        userId: data.testerId,
        type: 'task_assignment',
        taskId: data.taskId,
        title: 'Task assigned to you',
        message: `“${task.title}” was added to your My Tasks`,
      });
    } catch (err) {
      // ignore notification failures
    }
  }

  // Notify assignee when tester marks not fixed
  if (isNotFixed && task.assignedTo && task.assignedTo !== userId) {
    try {
      await createNotification({
        userId: task.assignedTo,
        type: 'task_not_fixed',
        taskId: data.taskId,
        title: 'Task marked Not Fixed',
        message: `“${task.title}” was marked as not fixed by the tester`,
      });
    } catch (err) {
      // ignore notification failures
    }
  }

  // Notify assignee when attention user marks proceed
  if (isProceed && task.assignedTo && task.assignedTo !== userId) {
    try {
      await createNotification({
        userId: task.assignedTo,
        type: 'task_attention_resolved',
        taskId: data.taskId,
        title: 'Attention resolved',
        message: `“${task.title}” was marked as proceed`,
      });
    } catch (err) {
      // ignore notification failures
    }
  }

  // Notify core stakeholders on completion or duplicate
  if (isTerminalCompletion) {
    const completionType = isDuplicate ? 'task_duplicate' : 'task_completed';
    const completionTitle = isDuplicate ? 'Task marked duplicate' : 'Task completed';
    const completionMessageBase = isDuplicate ? `“${task.title}” was closed as duplicate` : `“${task.title}” was marked as completed`;
    const completionMessage =
      isDuplicate && statusReason
        ? `${completionMessageBase}. Reason: ${statusReason}`
        : completionMessageBase;

    const recipientIds = [task.createdBy, task.assignedTo, task.raisedBy]
      .filter((value): value is string => Boolean(value) && value !== userId);

    const uniqueRecipientIds = Array.from(new Set(recipientIds));

    await Promise.all(
      uniqueRecipientIds.map(async targetId => {
        try {
          await createNotification({
            userId: targetId,
            type: completionType,
            taskId: data.taskId,
            title: completionTitle,
            message: completionMessage,
          });
        } catch (err) {
          // ignore notification failures
        }
      })
    );
  }

  // Emit real-time task updated event
  emitTaskUpdated(data.taskId, updatedTask);

  return updatedTask;
}
