import { useState, useEffect } from 'react';
import { useTask } from '../hooks/useTaskQueries';
import { useUpdateTaskStatus, useReopenTask, useCreateSubtask } from '../hooks/useTaskMutations';
import { CommentThread } from './CommentThread';
import { TaskModal } from './TaskModal';
import { Edit, Clock, User, Calendar, Tag as TagIcon, ShieldCheck, CheckSquare, Link2, Plus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import type { TaskStatus } from '../../../services/tasks';
import { Loading } from '../../../components/common/Loading';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../services/socket';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from '../../../services/tasks';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../../services/users';
import { RichTextEditor } from '../../../components/common/RichTextEditor';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { toast } from 'react-hot-toast';
import { CopyButton } from '../../../components/common/CopyButton';

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  proceed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  testing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  not_fixed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  reopened: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
};

const statusOrder: Record<TaskStatus, number> = {
  pending: 0,
  in_progress: 1,
  in_review: 2,
  proceed: 2,
  testing: 3,
  not_fixed: 1,
  completed: 4,
  paused: 1,
  blocked: 1,
  cancelled: 0,
  reopened: 0,
};

type TaskDetailsContentProps = {
  taskId: number;
  onTaskClick?: (taskId: number) => void; // Callback for nested task clicks (subtasks, dependencies)
  onClose?: () => void; // Allow parent side panel to close on delete
};

export function TaskDetailsContent({ taskId, onTaskClick, onClose }: TaskDetailsContentProps) {
  const { hasPermission, user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusAttentionId, setStatusAttentionId] = useState<string | null>(null);
  const [statusTesterId, setStatusTesterId] = useState<string | null>(null);

  const { data: task, isLoading } = useTask(taskId);
  const queryClient = useQueryClient();
  const updateStatus = useUpdateTaskStatus();
  const reopenTask = useReopenTask();
  const createSubtask = useCreateSubtask();
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers(1, 1000),
    staleTime: 5 * 60 * 1000,
    enabled: showStatusDialog,
  });

  // Join task room for real-time updates and listen for subtask creation
  useEffect(() => {
    joinTaskRoom(taskId);

    const socket = getSocket();
    if (!socket) return;

    // Listen for subtask created event
    const handleSubtaskCreated = (data: { parentTaskId: number; subtask: { id: number; title: string; status: TaskStatus } }) => {
      if (data.parentTaskId === taskId) {
        // Update the task query cache to include the new subtask
        queryClient.setQueryData(['task', taskId], (oldTask: Task | undefined) => {
          if (!oldTask) return oldTask;
          return {
            ...oldTask,
            subtasks: [...(oldTask.subtasks || []), data.subtask],
          };
        });
      }
    };

    // Listen for task updated event (in case subtask status changes affect parent)
    const handleTaskUpdated = (updatedTask: Task) => {
      if (updatedTask.id === taskId) {
        queryClient.setQueryData(['task', taskId], updatedTask);
      }
    };

    socket.on('subtask:created', handleSubtaskCreated);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('subtask:created', handleSubtaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      leaveTaskRoom(taskId);
    };
  }, [taskId, queryClient]);

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

const currentUserId = user?.id ? String(user.id) : null;
const isAttentionUser = !!(task.attentionToId && currentUserId && task.attentionToId === currentUserId);
const isTesterUser = !!(task.testerId && currentUserId && task.testerId === currentUserId);
const canMarkProceed = isAttentionUser;
const canMarkNotFixed = isTesterUser && task.status === 'testing';

  const dialogCurrentOrder = statusOrder[task.status];
  const dialogTargetOrder = selectedStatus ? statusOrder[selectedStatus] : undefined;
  const dialogIsBackward =
    dialogCurrentOrder !== undefined &&
    dialogTargetOrder !== undefined &&
    dialogTargetOrder < dialogCurrentOrder;
  const dialogNeedsTestingSkip = selectedStatus === 'completed' && !task.testerId;
  const dialogRequiresAttention = selectedStatus === 'blocked' || selectedStatus === 'in_review';
  const isResumingFromPause = task.status === 'paused' && selectedStatus === 'in_progress';
  const dialogRequiresReason =
    (dialogIsBackward && !isResumingFromPause) ||
    selectedStatus === 'blocked' ||
    selectedStatus === 'paused' ||
    selectedStatus === 'in_review' ||
    selectedStatus === 'proceed' ||
    selectedStatus === 'not_fixed' ||
    dialogNeedsTestingSkip;
  const statusConfirmDisabled =
    updateStatus.isPending ||
    (dialogRequiresAttention && !statusAttentionId) ||
    (dialogRequiresReason && !statusReason.trim());

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const currentOrder = statusOrder[task.status];
    const targetOrder = statusOrder[newStatus];
    const isBackward =
      currentOrder !== undefined &&
      targetOrder !== undefined &&
      targetOrder < currentOrder;
    const requiresAttention = newStatus === 'blocked' || newStatus === 'in_review';
    const isResuming = task.status === 'paused' && newStatus === 'in_progress';
    const requiresReason =
      (!isResuming && isBackward) ||
      newStatus === 'blocked' ||
      newStatus === 'paused' ||
      newStatus === 'in_review' ||
      newStatus === 'proceed' ||
      newStatus === 'not_fixed';
    const needsTestingSkipReason = newStatus === 'completed' && !task.testerId;
    const needsTesterSelection = newStatus === 'testing' && !task.testerId;
    const wantsReviewComment = newStatus === 'in_review';
    const shouldShowDialog =
      requiresAttention || requiresReason || needsTestingSkipReason || needsTesterSelection || wantsReviewComment;

    if (shouldShowDialog) {
      setSelectedStatus(newStatus);
      setShowStatusDialog(true);
      setStatusReason('');
      setStatusAttentionId(task.attentionToId || null);
      setStatusTesterId(task.testerId || null);
      return;
    }

    await updateStatus.mutateAsync({
      id: taskId,
      status: newStatus,
    });
  };

  const handleStatusConfirm = async () => {
    if (!selectedStatus) return;

    const requiresAttention = selectedStatus === 'blocked' || selectedStatus === 'in_review';
    const requiresProceed = selectedStatus === 'proceed';
    const requiresNotFixed = selectedStatus === 'not_fixed';
    const needsTestingSkipReason = selectedStatus === 'completed' && !task.testerId;
    const needsTesterSelection = selectedStatus === 'testing' && !task.testerId && !statusTesterId;
    const currentOrder = statusOrder[task.status];
    const targetOrder = statusOrder[selectedStatus];
    const isBackward =
      currentOrder !== undefined &&
      targetOrder !== undefined &&
      targetOrder < currentOrder;
    const isResuming = task.status === 'paused' && selectedStatus === 'in_progress';
    const requiresReason =
      (!isResuming && isBackward) ||
      selectedStatus === 'blocked' ||
      selectedStatus === 'paused' ||
      selectedStatus === 'in_review' ||
      requiresProceed ||
      requiresNotFixed;
    const wantsReviewComment = selectedStatus === 'in_review';
    // Convert HTML to plain text for reason field
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = statusReason;
    const plainTextReason = tempDiv.textContent || tempDiv.innerText || '';
    const trimmedReason = plainTextReason.trim();

    if (requiresAttention && !statusAttentionId) return;
    if ((requiresReason || needsTestingSkipReason) && !trimmedReason) return;
    if (needsTesterSelection && !statusTesterId) return;

    await updateStatus.mutateAsync({
      id: taskId,
      status: selectedStatus,
      attentionToId: requiresAttention ? statusAttentionId : undefined,
      statusReason: (requiresReason || needsTestingSkipReason || wantsReviewComment || trimmedReason)
        ? trimmedReason
        : undefined,
      testingSkipReason: needsTestingSkipReason ? trimmedReason : undefined,
      testerId: selectedStatus === 'testing' ? (statusTesterId || task.testerId || undefined) : undefined,
    });

    setShowStatusDialog(false);
    setSelectedStatus(null);
    setStatusReason('');
    setStatusAttentionId(null);
    setStatusTesterId(null);
  };

  const handleReopen = async () => {
    // Convert HTML to plain text for reason field
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reopenReason;
    const plainTextReason = tempDiv.textContent || tempDiv.innerText || '';
    if (!plainTextReason.trim()) return;
    await reopenTask.mutateAsync({
      id: taskId,
      reason: plainTextReason.trim(),
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
            <CopyButton
              text={`${window.location.origin}/tasks?taskId=${taskId}`}
              iconOnly={true}
            />
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
              <RichTextRenderer html={task.description} />
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
                    {[
                      { value: 'pending', label: 'Pending' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'in_review', label: 'In Review' },
                      { value: 'proceed', label: 'Proceed', visible: canMarkProceed },
                      { value: 'testing', label: 'Testing' },
                      { value: 'not_fixed', label: 'Not Fixed', visible: canMarkNotFixed },
                      { value: 'completed', label: 'Completed' },
                      { value: 'paused', label: 'Paused' },
                      { value: 'blocked', label: 'Blocked' },
                    ]
                      .map((opt) => ({
                        ...opt,
                        disabled: opt.visible === false && opt.value !== task.status,
                      }))
                      .filter((opt) => opt.visible === undefined || opt.visible || opt.value === task.status)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                          {opt.label}
                        </option>
                      ))}
                    {![
                      'pending',
                      'in_progress',
                      'in_review',
                      'proceed',
                      'testing',
                      'not_fixed',
                      'completed',
                      'paused',
                      'blocked',
                    ].includes(task.status) && (
                      <option value={task.status} disabled>
                        {task.status.replace('_', ' ')}
                      </option>
                    )}
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
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400">Tester:</span>
                  <span className="text-gray-900 dark:text-white">{task.tester.name || task.tester.email}</span>
                  {task.testerAssignedAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (added {new Date(task.testerAssignedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
              {task.attentionToUser && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-600 dark:text-gray-400">Attention:</span>
                  <span className="text-gray-900 dark:text-white">{task.attentionToUser.name || task.attentionToUser.email}</span>
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
        onDelete={() => {
          setIsEditModalOpen(false);
          if (onClose) onClose();
        }}
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
            <RichTextEditor
              value={reopenReason}
              onChange={setReopenReason}
              placeholder="Reason for reopening..."
              maxHeight="200px"
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
                disabled={reopenTask.isPending}
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
          <div className="bg-white dark:bg-[#1C252E] rounded-lg p-6 max-w-lg w-full space-y-4">
            {(() => {
              const dialogNeedsTestingSkip = selectedStatus === 'completed' && task && !task.testerId;
              const dialogRequiresAttention = selectedStatus === 'blocked' || selectedStatus === 'in_review';
              const dialogNeedsTester = selectedStatus === 'testing' && !task.testerId;
              const dialogCurrentOrder = task ? statusOrder[task.status] : undefined;
              const dialogTargetOrder = selectedStatus ? statusOrder[selectedStatus] : undefined;
              const dialogIsBackward =
                dialogCurrentOrder !== undefined &&
                dialogTargetOrder !== undefined &&
                dialogTargetOrder < dialogCurrentOrder;
              const dialogTitle = (() => {
                if (dialogNeedsTestingSkip) return 'Complete Without Tester';
                if (dialogNeedsTester) return 'Assign Tester';
                if (selectedStatus === 'blocked') return 'Mark Blocked';
              if (selectedStatus === 'proceed') return 'Mark Proceed';
              if (selectedStatus === 'not_fixed') return 'Mark Not Fixed';
                if (selectedStatus === 'in_review') return 'Send to Review';
                if (dialogIsBackward) return 'Provide Reason for Rollback';
                return 'Update Status';
              })();

              return (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dialogTitle}</h3>
                  <div className="space-y-3">
                    {dialogNeedsTestingSkip && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This task has no tester assigned. Please provide a reason for skipping testing.
                      </p>
                    )}
                    {(dialogIsBackward ||
                      selectedStatus === 'blocked' ||
                      selectedStatus === 'paused' ||
                      selectedStatus === 'in_review' ||
                      selectedStatus === 'proceed' ||
                      selectedStatus === 'not_fixed') && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Please add a brief note for this status change so the team has context.
                      </p>
                    )}

                    {dialogRequiresAttention && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">Assign to review / unblock</label>
                        <SearchableSelect
                          options={usersData?.data?.map((u: any) => ({
                            value: u.id,
                            label: u.name || u.email,
                          })) || []}
                          value={statusAttentionId || ''}
                          onChange={(value) => setStatusAttentionId(value || null)}
                          placeholder="Select user"
                          className="w-full"
                        />
                      </div>
                    )}

                    {dialogNeedsTester && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">Assign Tester</label>
                        <SearchableSelect
                          options={usersData?.data?.map((u: any) => ({
                            value: u.id,
                            label: u.name || u.email,
                          })) || []}
                          value={statusTesterId || ''}
                          onChange={(value) => setStatusTesterId(value || null)}
                          placeholder="Select tester"
                          className="w-full"
                        />
                      </div>
                    )}

                    {(dialogIsBackward ||
                      dialogNeedsTestingSkip ||
                      selectedStatus === 'blocked' ||
                      selectedStatus === 'paused' ||
                      selectedStatus === 'in_review' ||
                      selectedStatus === 'proceed' ||
                      selectedStatus === 'not_fixed') && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">Reason</label>
                        <RichTextEditor
                          value={statusReason}
                          onChange={setStatusReason}
                          placeholder="Add context for this status change..."
                          maxHeight="200px"
                        />
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowStatusDialog(false);
                  setSelectedStatus(null);
                  setStatusReason('');
                  setStatusAttentionId(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusConfirm}
                disabled={statusConfirmDisabled}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
              >
                {updateStatus.isPending ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
