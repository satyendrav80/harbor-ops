import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';

const prisma = new PrismaClient();

export async function deleteComment(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const taskId = parseInt(context.params.id);
  const commentId = parseInt(context.params.commentId);

  if (isNaN(taskId) || isNaN(commentId)) {
    throw new Error('Invalid IDs');
  }

  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.deleted || comment.taskId !== taskId) {
    throw new Error('Comment not found');
  }

  // Only allow user to delete their own comments
  if (comment.createdBy !== userId) {
    throw new Error('You can only delete your own comments');
  }

  await prisma.taskComment.update({
    where: { id: commentId },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  });

  return { success: true };
}
