import { useParams, useNavigate } from 'react-router-dom';
import { TaskDetailsContent } from '../components/TaskDetailsContent';
import { ArrowLeft } from 'lucide-react';

export function TaskDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskId = parseInt(id || '0');

  const handleTaskClick = (clickedTaskId: number) => {
    navigate(`/tasks/${clickedTaskId}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>
      </div>
      <TaskDetailsContent taskId={taskId} onTaskClick={handleTaskClick} />
    </div>
  );
}
