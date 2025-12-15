import { SidePanel } from '../../../components/common/SidePanel';
import { ReleaseNoteDetailsContent } from './ReleaseNoteDetailsContent';

type ReleaseNoteDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  releaseNoteId: number | null;
  onTaskClick?: (taskId: number) => void;
  onServiceClick?: (serviceId: number) => void;
  onEdit?: (releaseNoteId: number) => void;
};

export function ReleaseNoteDetailsSidePanel({ 
  isOpen, 
  onClose, 
  releaseNoteId,
  onTaskClick,
  onServiceClick,
  onEdit,
}: ReleaseNoteDetailsSidePanelProps) {
  if (!releaseNoteId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Release Note #${releaseNoteId}`}
      stackKey={releaseNoteId ? `release-note-${releaseNoteId}` : undefined}
      width="3xl"
    >
      <ReleaseNoteDetailsContent 
        releaseNoteId={releaseNoteId} 
        onTaskClick={onTaskClick}
        onServiceClick={onServiceClick}
        onEdit={onEdit}
        onClose={onClose}
      />
    </SidePanel>
  );
}
