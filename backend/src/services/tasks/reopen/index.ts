import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { createSprintHistoryRecord } from '../../../utils/taskValidation';
import { prisma } from '../../../dataStore';
import { sanitizeRichTextHtml, htmlToPlainText } from '../../../utils/richText';

export async function reopen(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);
  const reasonHtml = sanitizeRichTextHtml(data.reason);
  const reasonPlain = htmlToPlainText(reasonHtml);

  if (!reasonPlain) {
    throw new Error('Reason is required for reopening a task');
  }

  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    include: { sprint: true },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  if (!['completed', 'duplicate'].includes(task.status)) {
    throw new Error('Only completed or duplicate tasks can be reopened');
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
    await createSprintHistoryRecord(data.taskId, null, userId, `Task reopened: ${reasonPlain}`);
  }

  // Add comment with reopen reason
  const reopenCommentSections = [
    `<p><strong>Task Reopened</strong> (Count: ${reopenCount})</p>`,
    `<p><strong>Reason:</strong></p>${reasonHtml}`,
  ];

  await prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      content: reopenCommentSections.join('<br/><br/>'),
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
        reason: reasonPlain,
      },
    },
  });

  return updatedTask;
}
