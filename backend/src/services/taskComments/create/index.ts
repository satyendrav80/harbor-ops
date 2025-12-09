import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';

const prisma = new PrismaClient();

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

  return comment;
}
