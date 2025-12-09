import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const taskId = parseInt(context.params.id);

  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const { status, testingSkipped, testingSkipReason } = context.body;

  if (!status) {
    throw new Error('Status is required');
  }

  return {
    taskId,
    status,
    testingSkipped: testingSkipped === true,
    testingSkipReason,
  };
}
