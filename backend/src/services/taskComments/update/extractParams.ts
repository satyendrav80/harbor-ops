import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const taskId = parseInt(context.params.id);
  const commentId = parseInt(context.params.commentId);

  if (isNaN(taskId) || isNaN(commentId)) {
    throw new Error('Invalid IDs');
  }

  const { content } = context.body;

  if (!content || typeof content !== 'string') {
    throw new Error('Content is required');
  }

  return {
    taskId,
    commentId,
    content,
  };
}
