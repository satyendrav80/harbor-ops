import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useTasks } from '../hooks/useTaskQueries';
import { Loading } from '../../../components/common/Loading';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskIds: number[]) => void;
  title?: string;
  initialSelectedIds?: number[];
  showAllTasks?: boolean; // If true, show all tasks instead of just backlog
}

export function TaskSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Select Tasks',
  initialSelectedIds = [],
  showAllTasks = false,
}: TaskSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set(initialSelectedIds));

  // Initialize selected tasks when modal opens
  useEffect(() => {
    if (isOpen && initialSelectedIds.length > 0) {
      setSelectedTaskIds(new Set(initialSelectedIds));
    } else if (isOpen && initialSelectedIds.length === 0) {
      setSelectedTaskIds(new Set());
    }
  }, [isOpen, initialSelectedIds]);

  // Fetch tasks - all tasks if showAllTasks is true, otherwise backlog only
  const { data, isLoading } = useTasks({
    sprintId: showAllTasks ? undefined : null, // Backlog or all
    search: searchQuery || undefined,
    status: showAllTasks ? undefined : ['pending', 'in_progress', 'reopened', 'in_review'], // All statuses if showAllTasks
    limit: 100,
  });

  const tasks = data?.data || [];

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
    onConfirm(Array.from(selectedTaskIds));
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
          <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-700/50 rounded-lg bg-gray-50 dark:bg-gray-900/20">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500"><Loading className="w-6 h-6 mx-auto" /></div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tasks found</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {tasks.map(task => (
                  <li
                    key={task.id}
                    className={`p-3 flex items-center gap-3 hover:bg-white dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${selectedTaskIds.has(task.id)
                        ? 'bg-blue-50 dark:bg-primary/10'
                        : ''
                      }`}
                    onClick={() => toggleSelection(task.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={() => toggleSelection(task.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 dark:bg-gray-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{task.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
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
