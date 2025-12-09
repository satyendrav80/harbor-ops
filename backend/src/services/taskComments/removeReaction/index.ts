import { PrismaClient } from '@prisma/client';
import type { RequestContext } from '../../../types/common';

const prisma = new PrismaClient();

export async function removeReaction(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const commentId = parseInt(context.params.commentId);
  const emoji = context.params.emoji;

  if (isNaN(commentId) || !emoji) {
    throw new Error('Invalid parameters');
  }

  const reaction = await prisma.taskCommentReaction.findFirst({
    where: {
      commentId,
      userId,
      emoji,
    },
  });

  if (!reaction) {
    throw new Error('Reaction not found');
  }

  await prisma.taskCommentReaction.delete({
    where: { id: reaction.id },
  });

  return { success: true };
}
