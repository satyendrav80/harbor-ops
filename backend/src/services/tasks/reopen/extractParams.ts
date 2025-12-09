import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const taskId = parseInt(context.params.id);

  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const { reason } = context.body;

  if (!reason || typeof reason !== 'string') {
    throw new Error('Reason is required for reopening a task');
  }

  return {
    taskId,
    reason,
  };
}
