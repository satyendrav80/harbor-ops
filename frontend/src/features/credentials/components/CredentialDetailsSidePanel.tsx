import { SidePanel } from '../../../components/common/SidePanel';
import { CredentialDetailsContent } from './CredentialDetailsContent';

type CredentialDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  credentialId: number | null;
  onCredentialClick?: (credentialId: number) => void;
  onServerClick?: (serverId: number) => void;
  onServiceClick?: (serviceId: number) => void;
};

export function CredentialDetailsSidePanel({ 
  isOpen, 
  onClose, 
  credentialId, 
  onCredentialClick,
  onServerClick,
  onServiceClick 
}: CredentialDetailsSidePanelProps) {
  if (!credentialId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Credential #${credentialId}`}
      stackKey={credentialId ? `credential-${credentialId}` : undefined}
      width="3xl"
    >
      <CredentialDetailsContent 
        credentialId={credentialId} 
        onCredentialClick={onCredentialClick}
        onServerClick={onServerClick}
        onServiceClick={onServiceClick}
      />
    </SidePanel>
  );
}
