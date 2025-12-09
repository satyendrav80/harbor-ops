import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';

const prisma = new PrismaClient();

export async function update(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  const comment = await prisma.taskComment.findUnique({
    where: { id: data.commentId },
  });

  if (!comment || comment.deleted || comment.taskId !== data.taskId) {
    throw new Error('Comment not found');
  }

  // Only allow user to edit their own comments
  if (comment.createdBy !== userId) {
    throw new Error('You can only edit your own comments');
  }

  const updatedComment = await prisma.taskComment.update({
    where: { id: data.commentId },
    data: {
      content: data.content,
      isEdited: true,
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

  return updatedComment;
}
