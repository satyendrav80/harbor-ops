import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { createSprintHistoryRecord, wouldCreateParentCycle } from '../../../utils/taskValidation';
import { createNotification } from '../../notifications';
import { emitTaskUpdated } from '../../../socket/socket';
import { prisma } from '../../../dataStore';

export async function update(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  // Get existing task
  const existingTask = await prisma.task.findUnique({
    where: { id: data.taskId },
  });

  if (!existingTask || existingTask.deleted) {
    throw new Error('Task not found');
  }

  // Track sprint change for history
  const sprintChanged = data.sprintId !== undefined && data.sprintId !== existingTask.sprintId;

  // Track assignment change for assignedAt
  const assignmentChanged = data.assignedTo !== undefined && data.assignedTo !== existingTask.assignedTo;
  const isBeingAssigned = assignmentChanged && data.assignedTo !== null && existingTask.assignedTo === null;
  const isBeingReassigned = assignmentChanged && data.assignedTo !== null && existingTask.assignedTo !== null;
  const isBeingUnassigned = assignmentChanged && data.assignedTo === null;

  // Validate parent task if being changed
  if (data.parentTaskId !== undefined && data.parentTaskId !== existingTask.parentTaskId) {
    const wouldCycle = await wouldCreateParentCycle(data.taskId, data.parentTaskId);
    if (wouldCycle) {
      throw new Error('Cannot set parent task: would create a circular dependency');
    }

    // Verify parent task exists and is not deleted
    if (data.parentTaskId !== null) {
      const parentTask = await prisma.task.findUnique({
        where: { id: data.parentTaskId },
        select: { id: true, deleted: true },
      });

      if (!parentTask || parentTask.deleted) {
        throw new Error('Parent task not found');
      }
    }
  }

  // Prepare update data
  const updateData: any = {
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority,
    sprintId: data.sprintId,
    assignedTo: data.assignedTo,
    testerId: data.testerId,
    estimatedHours: data.estimatedHours,
    actualHours: data.actualHours,
    dueDate: data.dueDate,
    serviceId: data.serviceId,
    testingSkipReason: data.testingSkipReason,
    parentTaskId: data.parentTaskId,
    raisedBy: data.raisedBy,
    updatedBy: userId,
  } as any;

  // Set assignedAt when task is assigned for the first time or reassigned
  if (isBeingAssigned || isBeingReassigned) {
    updateData.assignedAt = new Date();
  } else if (isBeingUnassigned) {
    updateData.assignedAt = null;
  }

  // Update task
  const task = await prisma.task.update({
    where: { id: data.taskId },
    data: updateData,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      raisedByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      parentTask: { select: { id: true, title: true } },
    } as any,
  });

  // Update tags if provided
  if (data.tagIds !== undefined) {
    // Remove existing tags
    await prisma.taskTag.deleteMany({
      where: { taskId: data.taskId },
    });

    // Add new tags
    if (data.tagIds.length > 0) {
      await prisma.taskTag.createMany({
        data: data.tagIds.map((tagId) => ({
          taskId: data.taskId,
          tagId,
        })),
      });
    }
  }

  // Create sprint history if sprint changed
  if (sprintChanged) {
    await createSprintHistoryRecord(
      data.taskId,
      data.sprintId || null,
      userId,
      'Task moved to different sprint'
    );
  }

  // Create audit log
  await prisma.audit.create({
    data: {
      resourceType: 'task',
      resourceId: data.taskId.toString(),
      action: 'update',
      userId,
      changes: { before: existingTask, after: task },
    },
  });

  // Notify newly assigned user that the task was added to their My Tasks
  if ((isBeingAssigned || isBeingReassigned) && updateData.assignedTo && updateData.assignedTo !== userId) {
    try {
      await createNotification({
        userId: updateData.assignedTo,
        type: 'task_assignment',
        taskId: data.taskId,
        title: 'Task assigned to you',
        message: `“${task.title}” was added to your My Tasks`,
      });
    } catch (err) {
      // swallow notification errors
    }
  }

  // Emit real-time task updated event
  emitTaskUpdated(task.id, task);

  return task;
}
