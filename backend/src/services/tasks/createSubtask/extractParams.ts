import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const parentTaskId = parseInt(context.params.id);

  if (isNaN(parentTaskId)) {
    throw new Error('Invalid parent task ID');
  }

  const { title, description, assignedTo, estimatedHours } = context.body;

  if (!title || typeof title !== 'string') {
    throw new Error('Title is required');
  }

  return {
    parentTaskId,
    title,
    description,
    assignedTo,
    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
  };
}
