import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const taskId = parseInt(context.params.id);

  if (isNaN(taskId)) {
    throw new Error('Invalid task ID');
  }

  const { title, description, type, priority, sprintId, assignedTo, testerId, estimatedHours, actualHours, dueDate, tagIds, serviceId, testingSkipReason } = context.body;

  return {
    taskId,
    title,
    description,
    type,
    priority,
    sprintId: sprintId !== undefined ? (sprintId === null ? null : parseInt(sprintId)) : undefined,
    assignedTo: assignedTo !== undefined ? (assignedTo === null || assignedTo === '' ? null : assignedTo) : undefined,
    testerId: testerId !== undefined ? (testerId === null || testerId === '' ? null : testerId) : undefined,
    estimatedHours: estimatedHours !== undefined ? (estimatedHours === null ? null : parseFloat(estimatedHours)) : undefined,
    actualHours: actualHours !== undefined ? (actualHours === null ? null : parseFloat(actualHours)) : undefined,
    dueDate: dueDate !== undefined ? (dueDate === null ? null : new Date(dueDate)) : undefined,
    tagIds: tagIds !== undefined ? (Array.isArray(tagIds) ? tagIds.map((id: any) => parseInt(id)) : []) : undefined,
    serviceId: serviceId !== undefined ? (serviceId === null ? null : parseInt(serviceId)) : undefined,
    testingSkipReason: testingSkipReason !== undefined ? testingSkipReason : undefined,
  };
}
