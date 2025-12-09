import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import { emitReactionAdded } from '../../../socket/socket';

const prisma = new PrismaClient();

export async function addReaction(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const commentId = parseInt(context.params.commentId);
  const { emoji } = context.body;

  if (isNaN(commentId) || !emoji) {
    throw new Error('Invalid parameters');
  }

  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.deleted) {
    throw new Error('Comment not found');
  }

  const reaction = await prisma.taskCommentReaction.create({
    data: {
      commentId,
      userId,
      emoji,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Emit Socket.IO event for real-time updates
  emitReactionAdded(comment.taskId, commentId, reaction);

  return reaction;
}
