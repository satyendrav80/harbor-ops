import { SidePanel } from '../../../components/common/SidePanel';
import { ServiceDetailsContent } from './ServiceDetailsContent';

type ServiceDetailsSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number | null;
  onServiceClick?: (serviceId: number) => void;
  onServerClick?: (serverId: number) => void;
  onCredentialClick?: (credentialId: number) => void;
};

export function ServiceDetailsSidePanel({ 
  isOpen, 
  onClose, 
  serviceId, 
  onServiceClick,
  onServerClick,
  onCredentialClick 
}: ServiceDetailsSidePanelProps) {
  if (!serviceId) return null;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Service #${serviceId}`}
      stackKey={serviceId ? `service-${serviceId}` : undefined}
      width="3xl"
    >
      <ServiceDetailsContent 
        serviceId={serviceId} 
        onServiceClick={onServiceClick}
        onServerClick={onServerClick}
        onCredentialClick={onCredentialClick}
      />
    </SidePanel>
  );
}
