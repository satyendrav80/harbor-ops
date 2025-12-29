// Simplified sprint services - create remaining files as stubs for now
import type { RequestContext } from '../../../types/common';
import { prisma } from '../../../dataStore';

export async function update(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) throw new Error('User ID is required');

  const sprintId = parseInt(context.params.id);
  const { name, description, startDate, endDate, status } = context.body;

  const existing = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!existing || existing.deleted) throw new Error('Sprint not found');

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: { name, description, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, status, updatedBy: userId },
    include: { createdByUser: { select: { id: true, name: true, email: true } }, updatedByUser: { select: { id: true, name: true, email: true } } },
  });

  await prisma.audit.create({ data: { resourceType: 'sprint', resourceId: sprintId.toString(), action: 'update', userId, changes: { before: existing, after: sprint } } });
  return sprint;
}

export async function deleteSprint(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) throw new Error('User ID is required');

  const sprintId = parseInt(context.params.id);
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint || sprint.deleted) throw new Error('Sprint not found');

  await prisma.sprint.update({ where: { id: sprintId }, data: { deleted: true, deletedAt: new Date(), deletedBy: userId } });
  await prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } });
  await prisma.audit.create({ data: { resourceType: 'sprint', resourceId: sprintId.toString(), action: 'delete', userId } });

  return { success: true };
}

export async function list(context: RequestContext) {
  const { status, search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = context.body;
  const where: any = { deleted: false };
  if (status?.length) where.status = { in: status };
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];

  const skip = (page - 1) * limit;
  const total = await prisma.sprint.count({ where });
  const sprints = await prisma.sprint.findMany({
    where,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: { where: { deleted: false } } } },
      tasks: {
        where: { deleted: false },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
          _count: { select: { subtasks: true, comments: true, dependencies: true } }
        }
      }
    },
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit
  });

  // Calculate generic metrics if not present (simplified for list view)
  const terminalTaskStatuses = new Set(['completed', 'duplicate']);

  const sprintsWithMetrics = sprints.map(sprint => {
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter(t => terminalTaskStatuses.has(t.status)).length;
    return {
      ...sprint,
      metrics: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      }
    };
  });

  return { data: sprintsWithMetrics, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function addTasksToSprint(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) throw new Error('User ID is required');

  const sprintId = parseInt(context.params.id);
  const { taskIds } = context.body;

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint || sprint.deleted) throw new Error('Sprint not found');

  await prisma.task.updateMany({ where: { id: { in: taskIds }, deleted: false }, data: { sprintId } });

  const { createSprintHistoryRecord } = await import('../../../utils/taskValidation');
  for (const taskId of taskIds) {
    await createSprintHistoryRecord(taskId, sprintId, userId, 'Task added to sprint');
  }

  return { success: true };
}

export async function removeTaskFromSprint(context: RequestContext) {
  const userId = context.headers?.['x-user-id'] as string;
  if (!userId) throw new Error('User ID is required');

  const sprintId = parseInt(context.params.id);
  const taskId = parseInt(context.params.taskId);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.deleted || task.sprintId !== sprintId) throw new Error('Task not found in this sprint');

  await prisma.task.update({ where: { id: taskId }, data: { sprintId: null } });

  const { createSprintHistoryRecord } = await import('../../../utils/taskValidation');
  await createSprintHistoryRecord(taskId, null, userId, 'Task removed from sprint');

  return { success: true };
}
