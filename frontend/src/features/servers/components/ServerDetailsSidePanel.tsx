import { SidePanel } from '../../../components/common/SidePanel';
import { ServerDetailsContent } from './ServerDetailsContent';

type ServerDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  serverId: number | null;
  onServerClick?: (serverId: number) => void;
  onServiceClick?: (serviceId: number) => void;
  onCredentialClick?: (credentialId: number) => void;
};

export function ServerDetailsSidePanel({ 
  isOpen, 
  onClose, 
  serverId, 
  onServerClick,
  onServiceClick,
  onCredentialClick 
}: ServerDetailsSidePanelProps) {
  if (!serverId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Server #${serverId}`}
      stackKey={serverId ? `server-${serverId}` : undefined}
      width="3xl"
    >
      <ServerDetailsContent 
        serverId={serverId} 
        onServerClick={onServerClick}
        onServiceClick={onServiceClick}
        onCredentialClick={onCredentialClick}
      />
    </SidePanel>
  );
}
