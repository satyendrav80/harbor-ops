import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useTasks } from '../hooks/useTaskQueries';
import { useTasksAdvanced } from '../hooks/useTasksAdvanced';
import { TaskModal } from '../components/TaskModal';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailsSidePanel } from '../components/TaskDetailsSidePanel';
import { Loading } from '../../../components/common/Loading';
import { AdvancedFiltersPanel } from '../../release-notes/components/AdvancedFiltersPanel';
import { Search, Plus, Filter as FilterIcon, LayoutGrid, List, ShieldCheck } from 'lucide-react';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useDebounce } from '../../../hooks/useDebounce';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../../services/tasks';
import { useUpdateTask } from '../hooks/useTaskMutations';
import { listSprints } from '../../../services/sprints';
import { getTasksFilterMetadata } from '../../../services/tasks';
import { useQuery } from '@tanstack/react-query';
import type { Filter } from '../../release-notes/types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../utils/urlSync';
import { hasActiveFilters } from '../../release-notes/utils/filterState';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { SelectionBar } from '../../../components/common/SelectionBar';

export function TasksPage() {
  usePageTitle('Tasks');
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const updateTask = useUpdateTask();
  const [searchParams, setSearchParams] = useSearchParams();
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  // Initialize from URL params
  const urlFilters = useMemo(() => deserializeFiltersFromUrl(searchParams), [searchParams]);
  const [advancedFilters, setAdvancedFilters] = useState<Filter | undefined>(urlFilters.filters);
  const [orderBy, setOrderBy] = useState(urlFilters.orderBy);

  const [searchQuery, setSearchQuery] = useState(urlFilters.search || '');
  // Initialize viewFilter from URL params, default to 'my-tasks'
  const [viewFilter, setViewFilter] = useState<'my-tasks' | 'all'>(
    (searchParams.get('view') as 'my-tasks' | 'all') || 'my-tasks'
  );
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Initialize viewMode from URL params, default to 'grid'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(
    (searchParams.get('viewMode') as 'grid' | 'table') || 'grid'
  );
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [sidePanelTaskId, setSidePanelTaskId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['tasks', 'filter-metadata'],
    queryFn: () => getTasksFilterMetadata(),
  });

  // Update filters when URL changes
  useEffect(() => {
    const urlFilters = deserializeFiltersFromUrl(searchParams);
    if (urlFilters.filters) {
      setAdvancedFilters(urlFilters.filters);
    }
    if (urlFilters.orderBy) {
      setOrderBy(urlFilters.orderBy);
    }
    if (urlFilters.search !== undefined) {
      setSearchQuery(urlFilters.search || '');
    }
    // Update viewFilter from URL
    const urlView = searchParams.get('view') as 'my-tasks' | 'all' | null;
    if (urlView && (urlView === 'my-tasks' || urlView === 'all')) {
      setViewFilter(urlView);
    }
    // Update viewMode from URL
    const urlViewMode = searchParams.get('viewMode') as 'grid' | 'table' | null;
    if (urlViewMode && (urlViewMode === 'grid' || urlViewMode === 'table')) {
      setViewMode(urlViewMode);
    }
  }, [searchParams]);

  // Use advanced filtering if advanced filters are active, otherwise use default "My Tasks" filter
  const useAdvancedFiltering = hasActiveFilters(advancedFilters) || orderBy !== undefined;

  // Build default "My Tasks" filter: (assignedTo = userId OR testerId = userId) AND status != completed
  const myTasksFilter: Filter | undefined = useMemo(() => {
    if (useAdvancedFiltering || !user?.id) return undefined;
    
    if (viewFilter === 'my-tasks') {
      return {
        condition: 'and',
        childs: [
          {
            condition: 'or',
            childs: [
              { key: 'assignedTo', type: 'STRING', operator: 'eq', value: user.id },
              { key: 'testerId', type: 'STRING', operator: 'eq', value: user.id },
              { key: 'attentionToId', type: 'STRING', operator: 'eq', value: user.id },
            ],
          },
          { key: 'status', type: 'STRING', operator: 'ne', value: 'completed' },
        ],
      };
    }
    return undefined;
  }, [viewFilter, user?.id, useAdvancedFiltering]);

  // Combine myTasksFilter with advancedFilters if both exist
  const finalFilters: Filter | undefined = useMemo(() => {
    if (useAdvancedFiltering) {
      return advancedFilters;
    }
    return myTasksFilter;
  }, [useAdvancedFiltering, advancedFilters, myTasksFilter]);

  // Advanced filtering hook
  const {
    data: advancedTasksData,
    isLoading: advancedTasksLoading,
    isFetching: isFetchingAdvancedTasks,
    error: advancedTasksError,
    fetchNextPage: fetchNextAdvancedTasksPage,
    hasNextPage: hasNextAdvancedTasksPage,
    isFetchingNextPage: isFetchingNextAdvancedTasksPage,
    refetch: refetchAdvancedTasks,
  } = useTasksAdvanced(
    {
      filters: finalFilters,
    search: debouncedSearch || undefined,
      orderBy,
    },
    20
  );

  // Always use advanced filtering hook (it handles both advanced and default filters)
  const tasksDataToUse = advancedTasksData;
  const tasksLoadingToUse = advancedTasksLoading;
  const tasksErrorToUse = advancedTasksError;

  // Flatten tasks from all pages
  const tasks = useMemo(() => {
    if (tasksDataToUse?.pages) {
      return tasksDataToUse.pages.flatMap((page) => page.data);
    }
    return [];
  }, [tasksDataToUse]);

  // Infinite scroll observer (only when using advanced filtering)
  const tasksObserverTarget = useInfiniteScroll({
    hasNextPage: useAdvancedFiltering ? (hasNextAdvancedTasksPage ?? false) : false,
    isFetchingNextPage: useAdvancedFiltering ? isFetchingNextAdvancedTasksPage : false,
    fetchNextPage: () => {
      if (useAdvancedFiltering && fetchNextAdvancedTasksPage) {
        fetchNextAdvancedTasksPage();
      }
    },
  });

  const { data: sprintsData } = useQuery({
    queryKey: ['sprints', { status: ['planned', 'active'] }],
    queryFn: () => listSprints({ status: ['planned', 'active'], limit: 100 }),
    enabled: selectedTaskIds.size > 0 && hasPermission('sprints:view'),
  });
  const sprintOptions = useMemo(
    () =>
      (sprintsData?.data || []).map((s: any) => ({
        value: String(s.id),
        label: s.name,
      })),
    [sprintsData?.data]
  );

  // Memoize handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearchQuery(newSearch);
    // Update URL params with search query
    const params = new URLSearchParams(searchParams);
    params.set('view', viewFilter);
    params.set('viewMode', viewMode);
    if (newSearch) {
      params.set('search', newSearch);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams, viewFilter, viewMode, searchParams]);

  const handleViewFilterChange = useCallback((value: 'my-tasks' | 'all') => {
    setViewFilter(value);
    // Clear advanced filters when using default view filter
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    // Update URL params with view filter
    const params = new URLSearchParams(searchParams);
    params.set('view', value);
    params.set('viewMode', viewMode);
    // Remove advanced filter params
    params.delete('filters');
    params.delete('orderBy');
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams, searchQuery, viewMode, searchParams]);

  const handleAdvancedFiltersApply = useCallback((filters: Filter | undefined) => {
    setAdvancedFilters(filters);
    // Reset to "all" view when using advanced filters
    setViewFilter('all');
    // Update URL params
    const params = serializeFiltersToUrl(filters, debouncedSearch || undefined, orderBy);
    params.set('view', 'all');
    params.set('viewMode', viewMode);
    setSearchParams(params, { replace: true });
    // Force refetch even if filters are the same
    refetchAdvancedTasks();
  }, [debouncedSearch, orderBy, viewMode, setSearchParams, refetchAdvancedTasks]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setViewFilter('my-tasks');
    // Update URL params with default view filter
    const params = new URLSearchParams(searchParams);
    params.set('view', 'my-tasks');
    params.set('viewMode', viewMode);
    params.delete('filters');
    params.delete('orderBy');
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams, searchQuery, viewMode, searchParams]);

  const toggleTaskSelection = (taskId: number) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleBulkAddToSprint = async (sprintIdValue: string | null) => {
    if (sprintIdValue === undefined || selectedTaskIds.size === 0) return;
    const sprintId = sprintIdValue === null ? null : parseInt(sprintIdValue);
    if (sprintIdValue !== null && isNaN(sprintId)) return;

    await Promise.all(
      Array.from(selectedTaskIds).map(id =>
        updateTask.mutateAsync({ id, data: { sprintId } })
      )
    );

    setSelectedTaskIds(new Set());
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
    setBulkSprintId('');
  }

  // --- RENDERING HELPERS ---

  const renderContent = () => {
    if (tasksLoadingToUse && tasks.length === 0) {
      return (
        <div className="py-20 flex justify-center">
          <Loading className="h-10 w-10 text-primary/20 animate-spin" />
        </div>
      );
    }

    if (tasksErrorToUse) {
      return (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load tasks. Please try again.
          </p>
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FilterIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tasks found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || useAdvancedFiltering
                ? "Try adjusting your filters"
                : "Create your first task to get started"}
            </p>
          </div>
        </div>
      );
    }

    if (viewMode === 'table') {
      return (
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 bg-white dark:bg-gray-800"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Task</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Status</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Priority</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Assignee</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Tester</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Attention</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Created By</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Created At</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Assigned At</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">Parent Task</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedTaskIds.has(task.id) ? 'bg-blue-50 dark:bg-primary/5' : ''
                    }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 bg-white dark:bg-gray-800"
                    />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSidePanelTaskId(task.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {task.type === 'bug' && '🐛'}
                        {task.type === 'feature' && '✨'}
                        {task.type === 'todo' && '📝'}
                        {task.type === 'epic' && '🎯'}
                        {task.type === 'improvement' && '⚡'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-md">
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize 
                      ${task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                          task.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`capitalize ${task.priority === 'critical' ? 'text-red-500' :
                      task.priority === 'high' ? 'text-orange-500' :
                        task.priority === 'medium' ? 'text-blue-500' :
                          'text-gray-500 dark:text-gray-400'
                      }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {task.assignedToUser?.name || task.assignedToUser?.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {task.tester && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      <div className="flex flex-col leading-tight">
                        <span>{task.tester?.name || task.tester?.email || '-'}</span>
                        {task.testerAssignedAt && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(task.testerAssignedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {task.attentionToUser?.name || task.attentionToUser?.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {task.createdByUser?.name || task.createdByUser?.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                    {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {task.parentTask ? (
                      <span
                        className="flex items-center gap-1 hover:text-primary cursor-pointer max-w-[150px] truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSidePanelTaskId(task.parentTask!.id);
                        }}
                      >
                        <span className="text-xs">↳</span> {task.parentTask.title}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="relative group">
            <div className={`absolute top-2 left-2 z-10 transition-opacity ${selectedTaskIds.has(task.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <input
                type="checkbox"
                checked={selectedTaskIds.has(task.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleTaskSelection(task.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-500 text-primary focus:ring-primary/50 cursor-pointer shadow-sm bg-white dark:bg-gray-800"
              />
            </div>
            <div className={`${selectedTaskIds.has(task.id) ? 'ring-2 ring-primary rounded-lg' : ''}`}>
              <TaskCard
                task={task}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    e.stopPropagation();
                    toggleTaskSelection(task.id);
                  } else {
                    setSidePanelTaskId(task.id);
                  }
                }}
                onParentTaskClick={(id) => setSidePanelTaskId(id)}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Left: Title & Subtitle */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">Tasks</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your tasks and track progress.
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search tasks..."
                className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-full placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* View Filter Dropdown */}
            {!useAdvancedFiltering && (
            <select
                value={viewFilter}
                onChange={(e) => handleViewFilterChange(e.target.value as 'my-tasks' | 'all')}
                className="px-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
                <option value="my-tasks">My Tasks</option>
                <option value="all">All Tasks</option>
            </select>
            )}

            {/* View Toggles */}
            <div className="flex items-center bg-gray-100 dark:bg-[#1C252E] rounded-lg p-1 border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setViewMode('grid');
                  // Update URL params
                  const params = new URLSearchParams(searchParams);
                  params.set('viewMode', 'grid');
                  setSearchParams(params, { replace: true });
                }}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-primary'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setViewMode('table');
                  // Update URL params
                  const params = new URLSearchParams(searchParams);
                  params.set('viewMode', 'table');
                  setSearchParams(params, { replace: true });
                }}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-primary'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Advanced Filters Button */}
            <button
              onClick={() => setAdvancedFiltersOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                hasActiveFilters(advancedFilters)
                  ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                  : 'bg-white dark:bg-[#1C252E] border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              <FilterIcon className="w-4 h-4" />
              Filters
              {hasActiveFilters(advancedFilters) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                  Active
                </span>
              )}
            </button>

            {hasPermission('tasks:create') && (
              <button
                onClick={() => setTaskModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            )}
          </div>
        </div>

      </header>

      {/* Content */}
      <div className="min-h-[200px]">
        {renderContent()}
      </div>

      {selectedTaskIds.size > 0 && (
        <SelectionBar
          count={selectedTaskIds.size}
          options={[{ value: '', label: 'Backlog' }, ...sprintOptions]}
          onApply={handleBulkAddToSprint}
          onCancel={clearSelection}
          placeholder="Add to Sprint..."
          applyLabel="Apply"
        />
      )}

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
      />

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="tasks"
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          fields={filterMetadata.fields}
          filters={advancedFilters}
          onApply={handleAdvancedFiltersApply}
          onClear={handleAdvancedFiltersClear}
        />
      )}

      {/* Infinite scroll target */}
      {hasNextAdvancedTasksPage && (
        <div ref={tasksObserverTarget} className="h-4" />
      )}

      {/* Task Details Side Panel */}
      <TaskDetailsSidePanel
        isOpen={sidePanelTaskId !== null}
        onClose={() => setSidePanelTaskId(null)}
        taskId={sidePanelTaskId}
        onTaskClick={(id) => setSidePanelTaskId(id)}
      />
    </div>
  );
}
