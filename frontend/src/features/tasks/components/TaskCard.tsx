import { Task, TaskStatus, TaskPriority, TaskType } from '../../../services/tasks';
import { Clock, User, MessageSquare, Link2, CheckSquare, Calendar, ShieldCheck, BellRing } from 'lucide-react';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';

type TaskCardProps = {
  task: Task;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onParentTaskClick?: (taskId: number) => void;
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  proceed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300',
  testing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
  not_fixed: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  completed: ' bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
  reopened: 'bg-pink-100 text-pink-800 dark:bg-pink-500/10 dark:text-pink-400',
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-gray-500 dark:text-gray-400',
  medium: 'text-blue-500 dark:text-blue-400',
  high: 'text-orange-500 dark:text-orange-400',
  critical: 'text-red-500 dark:text-red-400',
};

const typeIcons: Record<TaskType, string> = {
  bug: '🐛',
  feature: '✨',
  todo: '📝',
  epic: '🎯',
  improvement: '⚡',
};

export function TaskCard({ task, onClick, onParentTaskClick }: TaskCardProps) {
  const statusLabel = task.status.replace('_', ' ');

  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-800 rounded-lg p-5 hover:shadow-md transition-all cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
    >
      {/* Parent Task */}
      {task.parentTask && (
        <div className="mb-2">
          <span
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary cursor-pointer max-w-full truncate"
            onClick={(e) => {
              e.stopPropagation();
              if (onParentTaskClick && task.parentTask) {
                onParentTaskClick(task.parentTask.id);
              }
            }}
            title={`Parent: ${task.parentTask.title}`}
          >
            <span className="text-xs">↳</span>
            <span className="truncate">{task.parentTask.title}</span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{typeIcons[task.type]}</span>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1 text-base">
            {task.title}
          </h3>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap ${statusColors[task.status]}`}>
          {statusLabel}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-4 line-clamp-2">
          <RichTextRenderer html={task.description} variant="compact" />
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {task.tags.slice(0, 3).map((tagRel) => (
            <span
              key={tagRel.tag.id}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded dark:bg-opacity-20"
              style={{
                backgroundColor: tagRel.tag.color ? `${tagRel.tag.color}20` : undefined,
                color: tagRel.tag.color || undefined,
              }}
            >
              {tagRel.tag.value ? `${tagRel.tag.name}:${tagRel.tag.value}` : tagRel.tag.name}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
              +{task.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Priority */}
            <div className={`flex items-center gap-1.5 font-medium ${priorityColors[task.priority]}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
              <span className="capitalize">{task.priority}</span>
            </div>

            {/* Assigned User */}
            {task.assignedToUser && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{task.assignedToUser.name || task.assignedToUser.email.split('@')[0]}</span>
              </div>
            )}

            {/* Tester */}
            {task.tester && (
              <div className="flex items-center gap-1.5 text-xs" title="Tester">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300">{task.tester.name || task.tester.email.split('@')[0]}</span>
                {task.testerAssignedAt && (
                  <span className="text-gray-500 dark:text-gray-400">
                    · {new Date(task.testerAssignedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Attention */}
            {task.attentionToUser && (
              <div className="flex items-center gap-1.5" title="Attention / Reviewer">
                <BellRing className="w-3.5 h-3.5 text-purple-500" />
                <span>{task.attentionToUser.name || task.attentionToUser.email.split('@')[0]}</span>
              </div>
            )}

            {/* Created By User */}
            {task.createdByUser && (
              <div className="flex items-center gap-1.5" title="Created by">
                <span className="text-gray-400 dark:text-gray-500 text-xs">by</span>
                <span>{task.createdByUser.name || task.createdByUser.email.split('@')[0]}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Subtasks */}
            {task._count && task._count.subtasks > 0 && (
              <div className="flex items-center gap-1" title="Subtasks">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{task._count.subtasks}</span>
              </div>
            )}

            {/* Comments */}
            {task._count && task._count.comments > 0 && (
              <div className="flex items-center gap-1" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{task._count.comments}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Created At */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Assigned At */}
          {task.assignedAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Assigned: {new Date(task.assignedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Additional Metadata (if critical) - keeping minimal for clean look */}
        {(task.dueDate || task.reopenCount > 0) && (
          <div className="flex items-center gap-4 text-xs mt-1">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <Calendar className="w-3.5 h-3.5" />
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}

            {task.reopenCount > 0 && (
              <span className="text-pink-600 dark:text-pink-400 font-medium">
                Reopened {task.reopenCount}x
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
