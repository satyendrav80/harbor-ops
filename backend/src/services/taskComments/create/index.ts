import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { emitCommentCreated, getUsersInTaskRoom } from '../../../socket/socket';
import { createNotification } from '../../notifications';
import { prisma } from '../../../dataStore';

export async function create(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  // Validate task exists
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  // Validate parent comment if replying
  if (data.parentId) {
    const parentComment = await prisma.taskComment.findUnique({
      where: { id: data.parentId },
    });

    if (!parentComment || parentComment.deleted || parentComment.taskId !== data.taskId) {
      throw new Error('Parent comment not found');
    }
  }

  // Create comment
  const comment = await prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      content: data.content,
      parentId: data.parentId,
      createdBy: userId,
    },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      reactions: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Emit Socket.IO event for real-time updates
  emitCommentCreated(data.taskId, comment);

  // Create notifications for users who have commented on this task but aren't currently viewing it
  try {
    // Get all unique users who have commented on this task
    const commenters = await prisma.taskComment.findMany({
      where: {
        taskId: data.taskId,
        deleted: false,
        createdBy: { not: userId }, // Exclude the comment author
      },
      select: {
        createdBy: true,
      },
      distinct: ['createdBy'],
    });

    // Get users currently viewing the task (in Socket.IO room)
    const usersInRoom = getUsersInTaskRoom(data.taskId);

    // Get task details for notification
    const taskDetails = await prisma.task.findUnique({
      where: { id: data.taskId },
      select: {
        title: true,
        assignedTo: true,
        testerId: true,
      },
    });

    // Also notify task assignee and tester if they exist and aren't the comment author
    const usersToNotify = new Set<string>();
    
    commenters.forEach(c => usersToNotify.add(c.createdBy));
    if (taskDetails?.assignedTo && taskDetails.assignedTo !== userId) {
      usersToNotify.add(taskDetails.assignedTo);
    }
    if (taskDetails?.testerId && taskDetails.testerId !== userId) {
      usersToNotify.add(taskDetails.testerId);
    }

    // Get comment author name for notification
    const commentAuthor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const authorName = commentAuthor?.name || commentAuthor?.email || 'Someone';

    // Create notifications for users not currently viewing the task
    const notificationPromises = Array.from(usersToNotify)
      .filter(userIdToNotify => !usersInRoom.includes(userIdToNotify))
      .map(userIdToNotify =>
        createNotification({
          userId: userIdToNotify,
          type: 'task_comment',
          taskId: data.taskId,
          commentId: comment.id,
          title: `New comment on task: ${taskDetails?.title || 'Task'}`,
          message: `${authorName} commented on task "${taskDetails?.title || 'Task'}"`,
        }).catch(err => {
          console.error(`Failed to create notification for user ${userIdToNotify}:`, err);
          return null;
        })
      );

    await Promise.all(notificationPromises);
  } catch (error) {
    // Don't fail comment creation if notification creation fails
    console.error('Error creating notifications:', error);
  }

  return comment;
}
