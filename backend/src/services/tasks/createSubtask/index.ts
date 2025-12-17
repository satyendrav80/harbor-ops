import type { RequestContext } from '../../../types/common';
import { extractParams } from './extractParams';
import { emitSubtaskCreated } from '../../../socket/socket';
import { prisma } from '../../../dataStore';

export async function createSubtask(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) {
    throw new Error('User ID is required');
  }

  const data = extractParams(context);

  // Validate parent task exists
  const parentTask = await prisma.task.findUnique({
    where: { id: data.parentTaskId },
    include: { sprint: true },
  });

  if (!parentTask || parentTask.deleted) {
    throw new Error('Parent task not found');
  }

  // Create subtask (inherit sprint from parent)
  const subtask = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      parentTaskId: data.parentTaskId,
      sprintId: parentTask.sprintId,
      assignedTo: data.assignedTo,
      estimatedHours: data.estimatedHours,
      createdBy: userId,
    },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      parentTask: { select: { id: true, title: true } },
    },
  });

  // Emit Socket.IO event for real-time updates
  // Emit only the fields needed for subtask display (id, title, status)
  emitSubtaskCreated(data.parentTaskId, {
    id: subtask.id,
    title: subtask.title,
    status: subtask.status,
  });

  return subtask;
}
