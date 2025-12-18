import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

export async function get(context: RequestContext) {
  const taskId = parseInt(context.params.id);
  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      raisedByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
      completedByUser: { select: { id: true, name: true, email: true } },
      lastReopenedByUser: { select: { id: true, name: true, email: true } },
      attentionToUser: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true, status: true } },
      tags: { include: { tag: true } },
      parentTask: { select: { id: true, title: true } },
      subtasks: {
        where: { deleted: false },
        select: { id: true, title: true, status: true },
      },
      dependencies: {
        include: {
          blockedByTask: { select: { id: true, title: true, status: true } },
        },
      },
      blockedBy: {
        include: {
          task: { select: { id: true, title: true, status: true } },
        },
      },
      sprintHistory: {
        include: {
          sprint: { select: { id: true, name: true } },
          movedByUser: { select: { id: true, name: true } },
        },
        orderBy: { movedAt: 'desc' },
      },
      comments: {
        where: { deleted: false, parentId: null },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          replies: {
            where: { deleted: false },
            include: {
              createdByUser: { select: { id: true, name: true, email: true } },
              reactions: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    } as any,
  });

  if (!task || task.deleted) {
    throw new Error('Task not found');
  }

  return task;
}
