import dayjs from 'dayjs';
import { BurndownDataPoint, GanttTask } from '../types/tasks';
import { prisma } from '../dataStore';

/**
 * Generate burndown chart data for a sprint
 */
export async function generateBurndownData(sprintId: number): Promise<BurndownDataPoint[]> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      tasks: {
        where: { deleted: false },
        select: {
          id: true,
          status: true,
          completedAt: true,
        },
      },
    },
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  const startDate = dayjs(sprint.startDate);
  const endDate = dayjs(sprint.endDate);
  const totalDays = endDate.diff(startDate, 'day') + 1;
  const totalTasks = sprint.tasks.length;

  const data: BurndownDataPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const currentDate = startDate.add(i, 'day');
    const dateStr = currentDate.format('YYYY-MM-DD');

    // Ideal burndown: linear decrease from totalTasks to 0
    const ideal = totalTasks - (totalTasks / (totalDays - 1)) * i;

    // Actual: count tasks not completed by this date
    const completedByDate = sprint.tasks.filter((task) => {
      if (task.status !== 'completed' || !task.completedAt) {
        return false;
      }
      return dayjs(task.completedAt).isBefore(currentDate.endOf('day'));
    }).length;

    const actual = totalTasks - completedByDate;

    data.push({
      date: dateStr,
      ideal: Math.max(0, Math.round(ideal)),
      actual,
    });
  }

  return data;
}

/**
 * Generate Gantt chart data for a sprint
 */
export async function generateGanttData(sprintId: number): Promise<GanttTask[]> {
  const tasks = await prisma.task.findMany({
    where: {
      sprintId,
      deleted: false,
    },
    include: {
      dependencies: {
        select: {
          blockedByTaskId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  return tasks.map((task) => {
    // Calculate progress based on status
    let progress = 0;
    switch (task.status) {
      case 'completed':
        progress = 100;
        break;
      case 'testing':
        progress = 80;
        break;
      case 'in_review':
        progress = 60;
        break;
      case 'in_progress':
        progress = 40;
        break;
      case 'pending':
        progress = 0;
        break;
      default:
        progress = 20;
    }

    // Use task dates if available, otherwise use sprint dates
    const startDate = task.createdAt;
    const endDate = task.dueDate || sprint.endDate;

    return {
      id: task.id,
      title: task.title,
      startDate,
      endDate,
      progress,
      dependencies: task.dependencies.map((d) => d.blockedByTaskId),
    };
  });
}

/**
 * Calculate sprint metrics
 */
export async function calculateSprintMetrics(sprintId: number) {
  const tasks = await prisma.task.findMany({
    where: {
      sprintId,
      deleted: false,
    },
    select: {
      status: true,
      estimatedHours: true,
      actualHours: true,
    },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

  const velocity = completedTasks; // Simple velocity = completed tasks

  return {
    totalTasks,
    completedTasks,
    completionRate: Math.round(completionRate),
    totalEstimatedHours,
    totalActualHours,
    velocity,
  };
}
