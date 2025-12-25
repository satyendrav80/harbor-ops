import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listTasks, type TasksResponse } from '../../../services/tasks';
import { Loading } from '../../../components/common/Loading';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import type { TaskStatus, Task } from '../../../services/tasks';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskIds: number[]) => void;
  title?: string;
  initialSelectedIds?: number[];
  showAllTasks?: boolean; // If true, show all tasks instead of just backlog
  allowedStatuses?: TaskStatus[];
  excludedTaskIds?: number[];
  alwaysIncludeTasks?: Task[]; // Always show these tasks even if they don't match filters (e.g., already selected)
  serviceId?: number | null; // Service ID to prioritize tasks from the same service
  serviceName?: string;
  servicePort?: number | null;
  excludeReleaseNoteId?: number | null;
}

export function TaskSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Select Tasks',
  initialSelectedIds = [],
  showAllTasks = false,
  allowedStatuses,
  excludedTaskIds = [],
  alwaysIncludeTasks = [],
  serviceId,
  serviceName,
  servicePort,
  excludeReleaseNoteId,
}: TaskSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set(initialSelectedIds));
  const lastInitialIdsKey = useRef<string>('');
  const wasOpenRef = useRef<boolean>(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Initialize selected tasks when modal opens
  useEffect(() => {
    const key = initialSelectedIds.slice().sort().join(',');
    const opening = isOpen && !wasOpenRef.current;
    
    if (opening || (isOpen && key !== lastInitialIdsKey.current)) {
      lastInitialIdsKey.current = key;
      setSelectedTaskIds(new Set(initialSelectedIds));
    }

    if (!isOpen && wasOpenRef.current) {
      setSelectedTaskIds(new Set());
      lastInitialIdsKey.current = '';
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, initialSelectedIds]);

  const PAGE_SIZE = 1000;

  const normalizeId = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const numericValue = typeof value === 'string' ? Number(value) : value;
    return typeof numericValue === 'number' && Number.isFinite(numericValue) && numericValue > 0
      ? numericValue
      : null;
  };

  const normalizedExcludeReleaseNoteId = normalizeId(excludeReleaseNoteId);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<TasksResponse>({
    queryKey: [
      'task-selection',
      {
        searchQuery,
        showAllTasks,
        allowedStatuses,
        excludedTaskIds,
        alwaysIncludeTasks,
        excludeReleaseNoteId: normalizedExcludeReleaseNoteId,
      },
    ],
    queryFn: ({ pageParam = 1 }: any) =>
      listTasks({
        sprintId: showAllTasks ? undefined : null, // Backlog or all
        search: searchQuery || undefined,
        status: allowedStatuses
          ? allowedStatuses
          : showAllTasks
          ? undefined
          : ['pending', 'in_progress', 'reopened', 'in_review'],
        page: pageParam,
        limit: PAGE_SIZE,
        excludeReleaseNoteId:
          normalizedExcludeReleaseNoteId !== null ? normalizedExcludeReleaseNoteId : undefined,
      }),
    getNextPageParam: (lastPage: TasksResponse) => {
      const nextPage = lastPage.pagination.page + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
    enabled: isOpen,
    staleTime: 0,
    initialPageParam: 1,
  });

  const tasksFromPages = (data?.pages as TasksResponse[] | undefined)?.flatMap((p) => p.data) || [];

  const filteredTasks = tasksFromPages
    .filter((t) => !excludedTaskIds.includes(t.id))
    .filter((t) => !allowedStatuses || allowedStatuses.includes(t.status));

  // Merge always-include tasks (e.g., already selected) even if they don't meet filters
  const taskMap = new Map<number, Task>();
  [...filteredTasks, ...alwaysIncludeTasks].forEach((t) => {
    if (!excludedTaskIds.includes(t.id)) {
      taskMap.set(t.id, t);
    }
  });

  const getTaskServiceId = (task: Task) => normalizeId(task.serviceId ?? task.service?.id);

  const tasks = Array.from(taskMap.values());
  const normalizedServiceId = normalizeId(serviceId);
  const sameServiceTasks =
    normalizedServiceId !== null
      ? tasks.filter((t) => getTaskServiceId(t) === normalizedServiceId)
      : [];
  const otherServiceTasks =
    normalizedServiceId !== null
      ? tasks.filter((t) => getTaskServiceId(t) !== normalizedServiceId)
      : [];
  const sameServiceHeader = serviceName
    ? `Tasks for ${serviceName}${servicePort ? ` (:${servicePort})` : ''}`
    : 'Tasks for selected service';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
      }, 0);
    }
  }, [isOpen, searchQuery, showAllTasks, allowedStatuses, normalizedExcludeReleaseNoteId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      target.scrollTop + target.clientHeight >= target.scrollHeight - 50
    ) {
      fetchNextPage();
    }
  };

  const toggleSelection = (taskId: number) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const handleConfirm = () => {
    const confirmedIds = Array.from(selectedTaskIds);
    onConfirm(confirmedIds);
    onClose();
    // Reset selection after closing (will be re-initialized if modal reopens with initialSelectedIds)
    setSelectedTaskIds(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (!isOpen) return null;

  const renderTaskRow = (task: Task, { showServiceBadge }: { showServiceBadge?: boolean } = {}) => (
    <li
      key={task.id}
      className={`p-3 flex items-start gap-3 hover:bg-white dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
        selectedTaskIds.has(task.id) ? 'bg-blue-50 dark:bg-primary/10' : ''
      }`}
      onClick={() => toggleSelection(task.id)}
    >
      <input
        type="checkbox"
        checked={selectedTaskIds.has(task.id)}
        onChange={() => toggleSelection(task.id)}
        className="mt-1 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 dark:bg-gray-800"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded capitalize ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {task.status.replace('_', ' ')}
          </span>
          {showServiceBadge && (
            <span className="text-xs text-primary dark:text-primary-300 font-medium">
              {task.service?.name || 'No Service'}
            </span>
          )}
          {!showServiceBadge && task.service && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{task.service.name}</span>
          )}
          {task.sprint && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Sprint: {task.sprint.name}
            </span>
          )}
        </div>
        {task.description && (
          <div className="line-clamp-2">
            <RichTextRenderer html={task.description} variant="compact" />
          </div>
        )}
      </div>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#1C252E] rounded-lg shadow-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={showAllTasks ? "Search tasks..." : "Search backlog..."}
              className="pl-10 pr-4 py-2 w-full text-sm bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Task List */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-700/50 rounded-lg bg-gray-50 dark:bg-gray-900/20"
            onScroll={handleScroll}
          >
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <Loading className="w-6 h-6 mx-auto" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tasks found</div>
            ) : normalizedServiceId !== null ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {sameServiceTasks.length > 0 && (
                  <>
                    <li className="px-3 py-2 bg-primary/10 dark:bg-primary/20 border-b border-primary/20">
                      <span className="text-xs font-semibold text-primary dark:text-primary-300">
                        {sameServiceHeader} ({sameServiceTasks.length})
                      </span>
                    </li>
                    {sameServiceTasks.map((task) => renderTaskRow(task))}
                  </>
                )}

                {otherServiceTasks.length > 0 && (
                  <>
                    <li className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Other Services ({otherServiceTasks.length})
                      </span>
                    </li>
                    {otherServiceTasks.map((task) => renderTaskRow(task, { showServiceBadge: true }))}
                  </>
                )}
              </ul>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {tasks.map((task) => renderTaskRow(task))}
              </ul>
            )}
            {isFetchingNextPage && (
              <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">Loading more...</div>
            )}
            {!hasNextPage && tasks.length > 0 && (
              <div className="p-2 text-center text-xs text-gray-400 dark:text-gray-500">No more tasks</div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedTaskIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialSelectedIds.length > 0 ? `Update Selection (${selectedTaskIds.size})` : `Add ${selectedTaskIds.size} Task${selectedTaskIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
