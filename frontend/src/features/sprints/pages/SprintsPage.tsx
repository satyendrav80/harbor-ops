import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, CheckCircle, Search, Trash2 } from 'lucide-react';
import { useSprints } from '../hooks/useSprintQueries';
import { useTasks } from '../../tasks/hooks/useTaskQueries';
import { SprintModal } from '../components/SprintModal';
import { TaskCard } from '../../tasks/components/TaskCard';
import { TaskModal } from '../../tasks/components/TaskModal';
import { TaskSelectionModal } from '../../tasks/components/TaskSelectionModal';
import { CompleteSprintModal } from '../components/CompleteSprintModal';
import { useAuth } from '../../auth/context/AuthContext';
import type { Sprint, SprintStatus } from '../../../services/sprints';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { addTasksToSprint, completeSprint, cancelSprint } from '../../../services/sprints';
import { toast } from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';

export function SprintsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskSelectionModalOpen, setIsTaskSelectionModalOpen] = useState(false);
  const [isCompleteSprintModalOpen, setIsCompleteSprintModalOpen] = useState(false);
  const [completeModalMode, setCompleteModalMode] = useState<'complete' | 'cancel'>('complete');

  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedSprintForNewTask, setSelectedSprintForNewTask] = useState<number | null>(null);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);
  const [addToSprintId, setAddToSprintId] = useState<number | null>(null);

  // Initialize filters from URL params
  const getStatusFilterFromUrl = (): SprintStatus[] => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',') as SprintStatus[];
      // Validate statuses
      const validStatuses: SprintStatus[] = ['active', 'planned', 'completed', 'cancelled'];
      return statuses.filter(s => validStatuses.includes(s));
    }
    return ['active', 'planned']; // Default
  };

  const [sprintStatusFilter, setSprintStatusFilter] = useState<SprintStatus[]>(getStatusFilterFromUrl());
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update filters when URL changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',') as SprintStatus[];
      const validStatuses: SprintStatus[] = ['active', 'planned', 'completed', 'cancelled'];
      const filteredStatuses = statuses.filter(s => validStatuses.includes(s));
      if (filteredStatuses.length > 0) {
        setSprintStatusFilter(filteredStatuses);
      }
    }
    const searchParam = searchParams.get('search');
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  const { data: sprintsData, isLoading: sprintsLoading } = useSprints({
    status: sprintStatusFilter,
    search: debouncedSearch || undefined,
    limit: 100,
  });

  const { data: backlogData } = useTasks({
    sprintId: null,
    limit: 100,
  });

  // Mutations
  const addTasksMutation = useMutation({
    mutationFn: ({ sprintId, taskIds }: { sprintId: number, taskIds: number[] }) =>
      addTasksToSprint(sprintId, taskIds),
    onSuccess: () => {
      toast.success('Tasks added to sprint');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
    onError: () => toast.error('Failed to add tasks'),
  });

  const completeSprintMutation = useMutation({
    mutationFn: ({ sprintId, moveIncompleteToSprintId }: { sprintId: number, moveIncompleteToSprintId: number | null }) =>
      completeSprint(sprintId, moveIncompleteToSprintId),
    onSuccess: () => {
      toast.success('Sprint completed successfully');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCompleteSprintModalOpen(false);
      setSprintToComplete(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to complete sprint'),
  });

  const cancelSprintMutation = useMutation({
    mutationFn: ({ sprintId, moveTasksToSprintId }: { sprintId: number, moveTasksToSprintId: number | null }) =>
      cancelSprint(sprintId, moveTasksToSprintId),
    onSuccess: () => {
      toast.success('Sprint cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCompleteSprintModalOpen(false);
      setSprintToComplete(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to cancel sprint'),
  });

  const handleSprintClick = (sprintId: number) => {
    setSelectedSprintId(sprintId);
    setIsSprintModalOpen(true);
  };

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleCreateTaskInSprint = (sprintId: number | null) => {
    setSelectedSprintForNewTask(sprintId);
    setIsTaskModalOpen(true);
  };

  const handleOpenAddExisting = (sprintId: number) => {
    setAddToSprintId(sprintId);
    setIsTaskSelectionModalOpen(true);
  };

  const handleOpenCompleteSprint = (sprint: Sprint) => {
    setSprintToComplete(sprint);
    setCompleteModalMode('complete');
    setIsCompleteSprintModalOpen(true);
  };

  const handleOpenCancelSprint = (sprint: Sprint) => {
    setSprintToComplete(sprint);
    setCompleteModalMode('cancel');
    setIsCompleteSprintModalOpen(true);
  }

  const handleAddTasksConfirm = async (taskIds: number[]) => {
    if (addToSprintId) {
      await addTasksMutation.mutateAsync({ sprintId: addToSprintId, taskIds });
    }
  };

  const handleCompleteOrCancelConfirm = async (targetSprintId: number | null) => {
    if (sprintToComplete) {
      if (completeModalMode === 'complete') {
        await completeSprintMutation.mutateAsync({ sprintId: sprintToComplete.id, moveIncompleteToSprintId: targetSprintId });
      } else {
        await cancelSprintMutation.mutateAsync({ sprintId: sprintToComplete.id, moveTasksToSprintId: targetSprintId });
      }
    }
  };

  const handleSprintStatusRedirect = (sprint: Sprint, newStatus: 'completed' | 'cancelled') => {
    setSprintToComplete(sprint);
    setCompleteModalMode(newStatus === 'completed' ? 'complete' : 'cancel');
    setIsCompleteSprintModalOpen(true);
    // Modal will close automatically via onClose from SprintModal, but we ensure state is set.
  };

  const handleCloseSprintModal = () => {
    setIsSprintModalOpen(false);
    setSelectedSprintId(null);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
    setSelectedSprintForNewTask(null);
  };

  const selectedSprint = selectedSprintId
    ? sprintsData?.data.find((s) => s.id === selectedSprintId)
    : null;

  const selectedTask = selectedTaskId
    ? [...(backlogData?.data || []), ...(sprintsData?.data.flatMap(s => s.tasks || []) || [])].find((t) => t.id === selectedTaskId)
    : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-[#1C252E] border-b border-gray-200 dark:border-gray-700/50 p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Sprints</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage sprints and track progress
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const newSearch = e.target.value;
                  setSearchQuery(newSearch);
                  // Update URL params
                  const params = new URLSearchParams(searchParams);
                  if (newSearch) {
                    params.set('search', newSearch);
                  } else {
                    params.delete('search');
                  }
                  params.set('status', sprintStatusFilter.join(','));
                  setSearchParams(params, { replace: true });
                }}
                placeholder="Search sprints..."
                className="pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
              />
            </div>

            {/* Filter */}
            <select
              value={sprintStatusFilter.join(',')}
              onChange={(e) => {
                const newStatuses = e.target.value.split(',') as SprintStatus[];
                setSprintStatusFilter(newStatuses);
                // Update URL params
                const params = new URLSearchParams(searchParams);
                params.set('status', newStatuses.join(','));
                if (searchQuery) {
                  params.set('search', searchQuery);
                }
                setSearchParams(params, { replace: true });
              }}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="active,planned">Active & Planned</option>
              <option value="active">Active Only</option>
              <option value="planned">Planned Only</option>
              <option value="completed">Completed Only</option>
              <option value="active,planned,completed">All Sprints</option>
            </select>

            {hasPermission('sprints:create') && (
              <button
                onClick={() => setIsSprintModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                New Sprint
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Sprints List (Now First) */}
        {sprintsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 dark:text-gray-400">Loading sprints...</div>
          </div>
        ) : sprintsData?.data && sprintsData.data.length > 0 ? (
          sprintsData.data.map((sprint) => (
            <div
              key={sprint.id}
              className={`bg-white dark:bg-[#1C252E] border rounded-lg shadow-sm transition-shadow hover:shadow-md ${sprint.status === 'active'
                ? 'border-green-200 dark:border-green-900/30'
                : 'border-gray-200 dark:border-gray-700/50'
                }`}
            >
              <div className={`p-4 border-b ${sprint.status === 'active'
                ? 'bg-green-50/30 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                : 'bg-gray-50/50 border-gray-200 dark:bg-gray-800/20 dark:border-gray-700/50'
                }`}>
                <div className="flex items-center justify-between">
                  {/* Left: Title & Status */}
                  <div className="flex items-center gap-4">
                    <h2
                      onClick={() => handleSprintClick(sprint.id)}
                      className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary cursor-pointer flex items-center gap-2"
                    >
                      {sprint.name}
                    </h2>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full uppercase tracking-wide ${getStatusColor(sprint.status)}`}>
                      {sprint.status}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {sprint.status === 'active' && hasPermission('sprints:update') && (
                      <button
                        onClick={() => handleOpenCompleteSprint(sprint)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Complete Sprint
                      </button>
                    )}

                    {/* Cancel Button Removed - handled via Update Sprint -> Status: Cancelled */}

                    {hasPermission('tasks:create') && sprint.status !== 'completed' && (
                      <>
                        <button
                          onClick={() => handleCreateTaskInSprint(sprint.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> New Task
                        </button>
                        <button
                          onClick={() => handleOpenAddExisting(sprint.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Search className="w-3.5 h-3.5" /> Existing
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {sprint.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {sprint.description}
                  </p>
                )}

                {/* Metrics */}
                {sprint.metrics && (
                  <div className="flex items-center gap-6 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${sprint.metrics.completionRate}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-xs">
                          {sprint.metrics.completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sprint.metrics.completedTasks} of {sprint.metrics.totalTasks} tasks completed
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white dark:bg-[#1C252E]">
                {sprint.tasks && sprint.tasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sprint.tasks.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
                    <p className="text-sm">No tasks in this sprint</p>
                    {sprint.status !== 'completed' && (
                      <button
                        onClick={() => handleOpenAddExisting(sprint.id)}
                        className="text-primary hover:underline text-xs mt-1"
                      >
                        Add tasks from backlog
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium">No sprints found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              {sprintStatusFilter.length > 0 && sprintStatusFilter.length < 3
                ? "Try changing the status filter to see more sprints."
                : "Create a sprint to start organizing your work."}
            </p>
            {hasPermission('sprints:create') && (
              <button
                onClick={() => setIsSprintModalOpen(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Sprint
              </button>
            )}
          </div>
        )}

        {/* Backlog Section (Now Last) */}
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Backlog
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {backlogData?.data.length || 0}
                  </span>
                </h2>
              </div>
              {hasPermission('tasks:create') && (
                <button
                  onClick={() => handleCreateTaskInSprint(null)}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {backlogData?.data && backlogData.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {backlogData.data.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <p>Backlog is empty</p>
                <button
                  onClick={() => handleCreateTaskInSprint(null)}
                  className="mt-2 text-primary hover:underline text-sm"
                >
                  Create a task
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={handleCloseSprintModal}
        sprint={selectedSprint}
        onStatusChangeRedirect={handleSprintStatusRedirect}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        task={selectedTask}
        defaultSprintId={selectedSprintForNewTask || undefined}
      />

      <TaskSelectionModal
        isOpen={isTaskSelectionModalOpen}
        onClose={() => setIsTaskSelectionModalOpen(false)}
        onConfirm={handleAddTasksConfirm}
        title="Add Tasks from Backlog"
      />

      {sprintToComplete && (
        <CompleteSprintModal
          isOpen={isCompleteSprintModalOpen}
          onClose={() => {
            setIsCompleteSprintModalOpen(false);
            setSprintToComplete(null);
          }}
          onConfirm={handleCompleteOrCancelConfirm}
          sprint={sprintToComplete}
          mode={completeModalMode}
        />
      )}
    </div>
  );
}
