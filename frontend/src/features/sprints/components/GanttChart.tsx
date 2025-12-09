import { useMemo } from 'react';
import type { GanttTask } from '../../../services/sprints';

type GanttChartProps = {
  tasks: GanttTask[];
  sprintName: string;
};

export function GanttChart({ tasks, sprintName }: GanttChartProps) {
  const { minDate, maxDate, dateRange } = useMemo(() => {
    if (tasks.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), dateRange: 1 };
    }

    const dates = tasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)]);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const range = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { minDate: min, maxDate: max, dateRange: range };
  }, [tasks]);

  const getPosition = (date: Date) => {
    const daysSinceStart = Math.floor((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart / dateRange) * 100;
  };

  const getWidth = (startDate: Date, endDate: Date) => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return (days / dateRange) * 100;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {sprintName} - Gantt Chart
      </h3>

      {tasks.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          No tasks with dates in this sprint
        </p>
      ) : (
        <div className="space-y-4">
          {/* Timeline Header */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/50 pb-2">
            <div className="w-48 flex-shrink-0">Task</div>
            <div className="flex-1 flex justify-between px-2">
              <span>{formatDate(minDate)}</span>
              <span>{formatDate(maxDate)}</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map((task) => {
              const startDate = new Date(task.startDate);
              const endDate = new Date(task.endDate);
              const left = getPosition(startDate);
              const width = getWidth(startDate, endDate);

              return (
                <div key={task.id} className="flex items-center gap-2">
                  <div className="w-48 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.progress}% complete
                    </p>
                  </div>
                  <div className="flex-1 relative h-8 bg-gray-100 dark:bg-white/5 rounded">
                    <div
                      className="absolute top-0 bottom-0 bg-primary/20 dark:bg-primary/30 border-2 border-primary rounded flex items-center justify-center overflow-hidden"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-primary"
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="relative z-10 text-xs font-medium text-gray-900 dark:text-white px-2">
                        {formatDate(startDate)} - {formatDate(endDate)}
                      </span>
                    </div>

                    {/* Dependencies */}
                    {task.dependencies.length > 0 && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {task.dependencies.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
