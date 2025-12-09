import { SidePanel } from '../../../components/common/SidePanel';
import { DomainDetailsContent } from './DomainDetailsContent';

type DomainDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  domainId: number | null;
};

export function DomainDetailsSidePanel({ 
  isOpen, 
  onClose, 
  domainId 
}: DomainDetailsSidePanelProps) {
  if (!domainId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Domain #${domainId}`}
      width="3xl"
    >
      <DomainDetailsContent domainId={domainId} />
    </SidePanel>
  );
}
