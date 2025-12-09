import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const taskId = parseInt(context.params.id);

  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const { content, parentId } = context.body;

  if (!content || typeof content !== 'string') {
    throw new Error('Content is required');
  }

  return {
    taskId,
    content,
    parentId: parentId ? parseInt(parentId) : undefined,
  };
}
