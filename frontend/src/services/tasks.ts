import { apiFetch } from './apiClient';

// Task Types
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'in_review'
  | 'proceed'
  | 'testing'
  | 'not_fixed'
  | 'completed'
  | 'paused'
  | 'blocked'
  | 'cancelled'
  | 'reopened';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'bug' | 'feature' | 'todo' | 'epic' | 'improvement';
export type ReleaseNoteStatus = 'pending' | 'deployment_started' | 'deployed';

export type User = {
  id: string;
  name: string | null;
  email: string;
};

export type Task = {
  id: number;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  sprintId?: number | null;
  sprint?: {
    id: number;
    name: string;
    status: string;
  } | null;
  createdBy?: string | null;
  createdByUser?: User | null;
  raisedBy?: string | null;
  raisedByUser?: User | null;
  assignedTo?: string | null;
  assignedToUser?: User | null;
  assignedAt?: string | null;
  testerId?: string | null;
  tester?: User | null;
  testerAssignedAt?: string | null;
  attentionToId?: string | null;
  attentionToUser?: User | null;
  testingSkipped?: boolean;
  testingSkipReason?: string | null;
  completedBy?: string | null;
  completedByUser?: User | null;
  completedAt?: string | null;
  reopenCount: number;
  lastReopenedAt?: string | null;
  lastReopenedBy?: string | null;
  lastReopenedByUser?: User | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate?: string | null;
  serviceId?: number | null;
  service?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  updatedByUser?: User | null;
  parentTaskId?: number | null;
  parentTask?: {
    id: number;
    title: string;
  } | null;
  tags?: Array<{
    tag: {
      id: number;
      name: string;
      value?: string | null;
      color?: string | null;
    };
  }>;
  subtasks?: Array<{
    id: number;
    title: string;
    status: TaskStatus;
  }>;
  dependencies?: Array<{
    id: number;
    blockedByTask: {
      id: number;
      title: string;
      status: TaskStatus;
    };
  }>;
  sprintHistory?: Array<{
    id: number;
    sprintId?: number | null;
    sprint?: {
      id: number;
      name: string;
    } | null;
    movedAt: string;
    movedBy?: string | null;
    movedByUser?: {
      id: string;
      name: string | null;
    } | null;
    reason?: string | null;
  }>;
  comments?: TaskComment[];
  _count?: {
    subtasks: number;
    comments: number;
    dependencies: number;
  };
};

export type TaskComment = {
  id: number;
  taskId: number;
  parentId?: number | null;
  content: string;
  createdBy: string;
  createdByUser: User;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  deleted: boolean;
  replies?: TaskComment[];
  reactions?: Array<{
    id: number;
    emoji: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
    };
  }>;
};

export type TasksResponse = {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * List tasks with advanced filtering
 */
export async function listTasks(request: {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  testerId?: string[];
  sprintId?: number | null;
  createdBy?: string[];
  parentTaskId?: number | null;
  reopenCountMin?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actionableFor?: string;
  excludeReleaseNoteStatuses?: ReleaseNoteStatus[];
  excludeReleaseNoteId?: number;
}): Promise<TasksResponse> {
  return apiFetch<TasksResponse>('/tasks/list', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get a single task by ID
 */
export async function getTask(id: number): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`);
}

/**
 * Create a new task
 */
export async function createTask(data: {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  sprintId?: number;
  assignedTo?: string;
  testerId?: string;
  estimatedHours?: number;
  dueDate?: Date | string;
  tagIds?: number[];
  parentTaskId?: number;
  raisedBy?: string;
}): Promise<Task> {
  return apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a task
 */
export async function updateTask(id: number, data: {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  sprintId?: number | null;
  assignedTo?: string | null;
  testerId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate?: Date | string | null;
  tagIds?: number[];
  parentTaskId?: number | null;
  testingSkipReason?: string | null;
  raisedBy?: string | null;
}): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id: number): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Update task status
 */
export async function updateTaskStatus(id: number, data: {
  status: TaskStatus;
  testingSkipped?: boolean;
  testingSkipReason?: string;
  attentionToId?: string | null;
  statusReason?: string;
  testerId?: string | null;
}): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Reopen a task
 */
export async function reopenTask(id: number, reason: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/reopen`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Add dependency
 */
export async function addDependency(id: number, blockedByTaskId: number): Promise<any> {
  return apiFetch(`/tasks/${id}/dependencies`, {
    method: 'POST',
    body: JSON.stringify({ blockedByTaskId }),
  });
}

/**
 * Remove dependency
 */
export async function removeDependency(id: number, dependencyId: number): Promise<void> {
  return apiFetch<void>(`/tasks/${id}/dependencies/${dependencyId}`, {
    method: 'DELETE',
  });
}

/**
 * Create subtask
 */
export async function createSubtask(parentId: number, data: {
  title: string;
  description?: string;
  assignedTo?: string;
  estimatedHours?: number;
}): Promise<Task> {
  return apiFetch<Task>(`/tasks/${parentId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get subtasks
 */
export async function getSubtasks(parentId: number): Promise<Task[]> {
  return apiFetch<Task[]>(`/tasks/${parentId}/subtasks`);
}

/**
 * Create comment
 */
export async function createComment(taskId: number, data: {
  content: string;
  parentId?: number;
}): Promise<TaskComment> {
  return apiFetch<TaskComment>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update comment
 */
export async function updateComment(taskId: number, commentId: number, content: string): Promise<TaskComment> {
  return apiFetch<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

/**
 * Delete comment
 */
export async function deleteComment(taskId: number, commentId: number): Promise<void> {
  return apiFetch<void>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

/**
 * Add reaction to comment
 */
export async function addReaction(taskId: number, commentId: number, emoji: string): Promise<any> {
  return apiFetch(`/tasks/${taskId}/comments/${commentId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

/**
 * Remove reaction from comment
 */
export async function removeReaction(taskId: number, commentId: number, emoji: string): Promise<void> {
  return apiFetch<void>(`/tasks/${taskId}/comments/${commentId}/reactions/${emoji}`, {
    method: 'DELETE',
  });
}

/**
 * Advanced filtering endpoint
 * POST /tasks/list
 */
export async function listTasksAdvanced(request: {
  filters?: any;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: any;
}): Promise<TasksResponse> {
  return apiFetch<TasksResponse>('/tasks/list', {
    method: 'POST',
    body: JSON.stringify({
      filters: request.filters,
      search: request.search,
      page: request.page || 1,
      limit: request.limit || 20,
      orderBy: request.orderBy,
    }),
  });
}

/**
 * Get filter metadata
 * GET /tasks/filter-metadata
 */
export async function getTasksFilterMetadata(): Promise<any> {
  return apiFetch<any>('/tasks/filter-metadata');
}
