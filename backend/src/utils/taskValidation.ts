import { prisma } from '../dataStore';

/**
 * Check if a task has unresolved dependencies (blockedBy tasks that are not completed)
 */
export async function hasUnresolvedDependencies(taskId: number): Promise<{
  hasUnresolved: boolean;
  unresolvedTasks: Array<{ id: number; title: string; status: string }>;
}> {
  const dependencies = await prisma.taskDependency.findMany({
    where: { taskId },
    include: {
      blockedByTask: {
        select: {
          id: true,
          title: true,
          status: true,
          deleted: true,
        },
      },
    },
  });

  const unresolvedTasks = dependencies
    .filter(
      (dep) =>
        !dep.blockedByTask.deleted &&
        !['completed', 'duplicate'].includes(dep.blockedByTask.status)
    )
    .map((dep) => ({
      id: dep.blockedByTask.id,
      title: dep.blockedByTask.title,
      status: dep.blockedByTask.status,
    }));

  return {
    hasUnresolved: unresolvedTasks.length > 0,
    unresolvedTasks,
  };
}

/**
 * Check if adding a dependency would create a circular dependency
 */
export async function wouldCreateCircularDependency(
  taskId: number,
  blockedByTaskId: number
): Promise<boolean> {
  // Check if blockedByTaskId depends on taskId (directly or indirectly)
  const visited = new Set<number>();
  const queue = [blockedByTaskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;

    if (visited.has(currentTaskId)) {
      continue;
    }

    visited.add(currentTaskId);

    // If we find taskId in the dependency chain, it's circular
    if (currentTaskId === taskId) {
      return true;
    }

    // Get all tasks that currentTaskId depends on
    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId: currentTaskId },
      select: { blockedByTaskId: true },
    });

    queue.push(...dependencies.map((d) => d.blockedByTaskId));
  }

  return false;
}

/**
 * Check if all subtasks of a parent task are completed
 */
export async function areAllSubtasksCompleted(parentTaskId: number): Promise<{
  allCompleted: boolean;
  incompleteSubtasks: Array<{ id: number; title: string; status: string }>;
}> {
  const subtasks = await prisma.task.findMany({
    where: {
      parentTaskId,
      deleted: false,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  const incompleteSubtasks = subtasks.filter(
    (task) => !['completed', 'duplicate'].includes(task.status)
  );

  return {
    allCompleted: incompleteSubtasks.length === 0,
    incompleteSubtasks,
  };
}

/**
 * Validate status transition based on workflow rules
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  task: {
    assignedTo: string | null;
    testerId: string | null;
    testingSkipped: boolean;
    testingSkipReason: string | null;
    statusReason?: string | null;
  }
): { valid: boolean; error?: string } {
  // Free-flowing transitions: Allow potentially any transition, but check for required fields for specific destination statuses

  // 1. Moving to 'in_progress' requires an assignee
  if (newStatus === 'in_progress' && !task.assignedTo) {
    return { valid: false, error: 'Task must be assigned before moving to in_progress' };
  }

  // 2. Moving to 'testing' requires a tester (unless it's just being moved there and not worked on? No, usually implies active testing)
  if (newStatus === 'testing' && !task.testerId) {
    return { valid: false, error: 'Tester must be assigned before moving to testing' };
  }

  const terminalCompletionStatuses = ['completed', 'duplicate'];

  // 3. Moving to 'completed' or 'duplicate' without testing requires a reason (if skipping testing is toggled)
  // Note: If jumping straight to completed from in_progress, we assume standard flow might be skipped.
  // We only check this if the request explicitly says testing is skipped.
  if (terminalCompletionStatuses.includes(newStatus) && task.testingSkipped && !task.testingSkipReason) {
    return {
      valid: false,
      error: 'Must provide testing skip reason to close without testing',
    };
  }

  // 3b. Completing or marking duplicate without a tester requires an explicit reason
  if (terminalCompletionStatuses.includes(newStatus) && !task.testerId) {
    const reason = (task.testingSkipReason || task.statusReason || '').trim();
    if (!reason) {
      return {
        valid: false,
        error: 'Assign a tester or provide a reason to close without one',
      };
    }
  }

  // 4. Blocked/Paused/Cancelled/Proceed/Not Fixed/Duplicate are always allowed (field-level checks handled elsewhere)
  if (['blocked', 'paused', 'cancelled', 'proceed', 'not_fixed', 'duplicate'].includes(newStatus)) {
    return { valid: true };
  }

  // Allow all other transitions ("Free flowing")
  return { valid: true };
}

/**
 * Check if setting a parent task would create a cycle
 */
export async function wouldCreateParentCycle(
  taskId: number,
  parentTaskId: number | null
): Promise<boolean> {
  if (!parentTaskId) {
    return false; // No parent, no cycle possible
  }

  // Can't be parent of itself
  if (parentTaskId === taskId) {
    return true;
  }

  // Walk up the parent chain from the proposed parent
  // If we encounter taskId, it's a cycle
  const visited = new Set<number>();
  let currentTaskId: number | null = parentTaskId;

  while (currentTaskId !== null) {
    if (visited.has(currentTaskId)) {
      // Already visited this task, potential cycle (shouldn't happen in valid data)
      break;
    }

    visited.add(currentTaskId);

    // If we find taskId in the parent chain, it's a cycle
    if (currentTaskId === taskId) {
      return true;
    }

    // Get the parent of current task
    const currentTask = await prisma.task.findUnique({
      where: { id: currentTaskId },
      select: { parentTaskId: true },
    });

    if (!currentTask) {
      break; // Task not found, stop
    }

    currentTaskId = currentTask.parentTaskId;
  }

  return false;
}

/**
 * Create sprint history record when task moves between sprints
 */
export async function createSprintHistoryRecord(
  taskId: number,
  sprintId: number | null,
  userId: string,
  reason?: string
) {
  return await prisma.taskSprintHistory.create({
    data: {
      taskId,
      sprintId,
      movedBy: userId,
      reason,
    },
  });
}
