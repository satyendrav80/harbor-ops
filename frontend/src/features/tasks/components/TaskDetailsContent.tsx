import { useState } from 'react';
import { useTask } from '../hooks/useTaskQueries';
import { useUpdateTaskStatus, useReopenTask, useCreateSubtask } from '../hooks/useTaskMutations';
import { CommentThread } from './CommentThread';
import { TaskModal } from './TaskModal';
import { Edit, Clock, User, Calendar, Tag as TagIcon, CheckSquare, Link2, Plus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import type { TaskStatus } from '../../../services/tasks';
import { Loading } from '../../../components/common/Loading';

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  testing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  reopened: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
};

type TaskDetailsContentProps = {
  taskId: number;
  onTaskClick?: (taskId: number) => void; // Callback for nested task clicks (subtasks, dependencies)
};

export function TaskDetailsContent({ taskId, onTaskClick }: TaskDetailsContentProps) {
  const { hasPermission } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [testingSkipReason, setTestingSkipReason] = useState('');

  const { data: task, isLoading } = useTask(taskId);
  const updateStatus = useUpdateTaskStatus();
  const reopenTask = useReopenTask();
  const createSubtask = useCreateSubtask();

  const handleTaskNavigation = (id: number) => {
    if (onTaskClick) {
      onTaskClick(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading className="w-6 h-6" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Task not found</p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === 'completed' && !task.testerId) {
      setSelectedStatus(newStatus);
      setShowStatusDialog(true);
      return;
    }

    await updateStatus.mutateAsync({
      id: taskId,
      status: newStatus,
    });
  };

  const handleStatusConfirm = async () => {
    if (!selectedStatus) return;

    if (selectedStatus === 'completed' && !task.testerId && !testingSkipReason.trim()) {
      return;
    }

    await updateStatus.mutateAsync({
      id: taskId,
      status: selectedStatus,
      testingSkipReason: testingSkipReason || undefined,
    });

    setShowStatusDialog(false);
    setSelectedStatus(null);
    setTestingSkipReason('');
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    await reopenTask.mutateAsync({
      id: taskId,
      reason: reopenReason,
    });
    setShowReopenDialog(false);
    setReopenReason('');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {task.title}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${statusColors[task.status]}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                #{task.id}
              </span>
              {task.reopenCount > 0 && (
                <span className="text-sm bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                  Reopened {task.reopenCount}x
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('tasks:create') && (
              <button
                onClick={() => setIsSubtaskModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Subtask
              </button>
            )}
            {hasPermission('tasks:update') && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          )}

          {/* Comments */}
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <CommentThread taskId={taskId} comments={task.comments || []} onTaskClick={onTaskClick} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Actions */}
          {hasPermission('tasks:update') && (
            <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status</h3>
              <div className="space-y-2">
                {task.status === 'completed' ? (
                  <button
                    onClick={() => setShowReopenDialog(true)}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Reopen Task
                  </button>
                ) : (
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="blocked">Blocked</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 w-20">Type:</span>
                <span className="text-gray-900 dark:text-white capitalize">{task.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 w-20">Priority:</span>
                <span className="text-gray-900 dark:text-white capitalize">{task.priority}</span>
              </div>
              {task.assignedToUser && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Assigned:</span>
                  <span className="text-gray-900 dark:text-white">{task.assignedToUser.name || task.assignedToUser.email}</span>
                </div>
              )}
              {task.tester && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Tester:</span>
                  <span className="text-gray-900 dark:text-white">{task.tester.name || task.tester.email}</span>
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Estimated:</span>
                  <span className="text-gray-900 dark:text-white">{task.estimatedHours}h</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Due:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {task.sprint && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Sprint:</span>
                  <span className="text-gray-900 dark:text-white">{task.sprint.name}</span>
                </div>
              )}
              {task.service && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Service:</span>
                  <span className="text-gray-900 dark:text-white">{task.service.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dependencies */}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Blocked By
              </h3>
              <div className="space-y-2">
                {task.dependencies.map((dep) => (
                  <div key={dep.id} className="text-sm">
                    <button
                      onClick={() => handleTaskNavigation(dep.blockedByTask.id)}
                      className="text-primary hover:text-primary/80"
                    >
                      #{dep.blockedByTask.id} {dep.blockedByTask.title}
                    </button>
                    <span className="ml-2 text-xs text-gray-500">
                      ({dep.blockedByTask.status})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Subtasks ({task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length})
              </h3>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={subtask.status === 'completed'}
                      readOnly
                      className="w-4 h-4"
                    />
                    <button
                      onClick={() => handleTaskNavigation(subtask.id)}
                      className="text-gray-900 dark:text-white hover:text-primary"
                    >
                      {subtask.title}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
      />

      <TaskModal
        isOpen={isSubtaskModalOpen}
        onClose={() => setIsSubtaskModalOpen(false)}
        defaultParentTaskId={taskId}
      />

      {/* Reopen Dialog */}
      {showReopenDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1C252E] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reopen Task</h3>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Reason for reopening..."
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReopenDialog(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                disabled={!reopenReason.trim() || reopenTask.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
              >
                {reopenTask.isPending ? 'Reopening...' : 'Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Dialog */}
      {showStatusDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1C252E] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Complete Without Testing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This task has no tester assigned. Please provide a reason for skipping testing.
            </p>
            <textarea
              value={testingSkipReason}
              onChange={(e) => setTestingSkipReason(e.target.value)}
              placeholder="Explain why testing is not needed..."
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowStatusDialog(false);
                  setSelectedStatus(null);
                  setTestingSkipReason('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusConfirm}
                disabled={!testingSkipReason.trim() || updateStatus.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
              >
                {updateStatus.isPending ? 'Updating...' : 'Complete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
