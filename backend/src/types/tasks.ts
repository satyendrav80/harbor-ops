// Task Management Types
export interface TaskFilters {
  status?: string[];
  type?: string[];
  priority?: string[];
  assignedTo?: string[];
  testerId?: string[];
  sprintId?: number | null;
  createdBy?: string[];
  parentTaskId?: number | null;
  reopenCountMin?: number;
  search?: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  type?: 'bug' | 'feature' | 'todo' | 'epic' | 'improvement';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  sprintId?: number;
  assignedTo?: string;
  testerId?: string;
  estimatedHours?: number;
  dueDate?: Date;
  tagIds?: number[];
  parentTaskId?: number;
  raisedBy?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  type?: 'bug' | 'feature' | 'todo' | 'epic' | 'improvement';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  sprintId?: number | null;
  assignedTo?: string | null;
  testerId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate?: Date | null;
  tagIds?: number[];
  parentTaskId?: number | null;
  raisedBy?: string | null;
}

export interface UpdateTaskStatusDTO {
  status:
    | 'pending'
    | 'in_progress'
    | 'in_review'
    | 'proceed'
    | 'testing'
    | 'not_fixed'
    | 'completed'
    | 'duplicate'
    | 'paused'
    | 'blocked'
    | 'cancelled'
    | 'reopened';
  testingSkipped?: boolean;
  testingSkipReason?: string;
}

export interface ReopenTaskDTO {
  reason: string;
}

export interface CreateCommentDTO {
  content: string;
  parentId?: number;
}

export interface UpdateCommentDTO {
  content: string;
}

export interface AddDependencyDTO {
  blockedByTaskId: number;
}

export interface CreateSubtaskDTO {
  title: string;
  description?: string;
  assignedTo?: string;
  estimatedHours?: number;
}

// Sprint Types
export interface SprintFilters {
  status?: string[];
  search?: string;
}

export interface CreateSprintDTO {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateSprintDTO {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'planned' | 'active' | 'completed' | 'cancelled';
}

export interface AddTasksToSprintDTO {
  taskIds: number[];
}

export interface BurndownDataPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface GanttTask {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies: number[];
}
