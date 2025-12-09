import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const { title, description, type, priority, sprintId, assignedTo, testerId, estimatedHours, dueDate, tagIds, parentTaskId, serviceId, testingSkipReason } = context.body;

  if (!title || typeof title !== 'string') {
    throw new Error('Title is required');
  }

  return {
    title,
    description,
    type,
    priority,
    sprintId: sprintId ? parseInt(sprintId) : undefined,
    assignedTo: assignedTo && assignedTo !== '' ? assignedTo : undefined,
    testerId: testerId && testerId !== '' ? testerId : undefined,
    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    tagIds: Array.isArray(tagIds) ? tagIds.map((id: any) => parseInt(id)) : [],
    parentTaskId: parentTaskId ? parseInt(parentTaskId) : undefined,
    serviceId: serviceId ? parseInt(serviceId) : undefined,
    testingSkipReason,
  };
}
