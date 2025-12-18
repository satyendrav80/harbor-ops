import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { createSprintHistoryRecord } from '../../../utils/taskValidation';
import { emitSubtaskCreated, emitTaskCreated } from '../../../socket/socket';
import { prisma } from '../../../dataStore';

export async function create(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  // Create task
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type || 'todo',
      priority: data.priority || 'medium',
      sprintId: data.sprintId,
      assignedTo: data.assignedTo,
      assignedAt: data.assignedTo ? new Date() : null,
      testerId: data.testerId,
      estimatedHours: data.estimatedHours,
      dueDate: data.dueDate,
      parentTaskId: data.parentTaskId,
      serviceId: data.serviceId,
      createdBy: userId,
      raisedBy: data.raisedBy || userId, // Default to createdBy if not provided
    } as any,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      raisedByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    } as any,
  });

  // Add tags if provided
  if (data.tagIds && data.tagIds.length > 0) {
    await prisma.taskTag.createMany({
      data: data.tagIds.map((tagId) => ({
        taskId: task.id,
        tagId,
      })),
    });
  }

  // Create sprint history if task is assigned to a sprint
  if (data.sprintId) {
    await createSprintHistoryRecord(task.id, data.sprintId, userId, 'Task created in sprint');
  }

  // Create audit log
  await prisma.audit.create({
    data: {
      resourceType: 'task',
      resourceId: task.id.toString(),
      action: 'create',
      userId,
      changes: { created: task },
    },
  });

  // Emit Socket.IO event for subtask creation if this is a subtask
  if (data.parentTaskId) {
    // Emit only the fields needed for subtask display (id, title, status)
    emitSubtaskCreated(data.parentTaskId, {
      id: task.id,
      title: task.title,
      status: task.status,
    });
  }

  // Emit global task created event for real-time updates
  emitTaskCreated(task);

  return task;
}
