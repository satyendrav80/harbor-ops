import { SidePanel } from '../../../components/common/SidePanel';
import { TaskDetailsContent } from './TaskDetailsContent';

type TaskDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskClick?: (taskId: number) => void; // For nested task navigation within side panel
};

export function TaskDetailsSidePanel({ isOpen, onClose, taskId, onTaskClick }: TaskDetailsSidePanelProps) {
  if (!taskId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Task #${taskId}`}
      width="3xl"
    >
      <TaskDetailsContent taskId={taskId} onTaskClick={onTaskClick} onClose={onClose} />
    </SidePanel>
  );
}
