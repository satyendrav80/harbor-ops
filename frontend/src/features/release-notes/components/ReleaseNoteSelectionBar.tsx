import { SelectionBar } from '../../../components/common/SelectionBar';

type ReleaseNoteSelectionBarProps = {
  count: number;
  onCancel: () => void;
  onDelete?: () => void;
  onMarkDeployed?: () => void;
  onMarkDeploymentStarted?: () => void;
};

export function ReleaseNoteSelectionBar({
  count,
  onCancel,
  onDelete,
  onMarkDeployed,
  onMarkDeploymentStarted,
}: ReleaseNoteSelectionBarProps) {
  // Reuse SelectionBar with action options
  const options = [
    ...(onMarkDeploymentStarted ? [{ value: 'deployment_started', label: 'Mark Deployment Started' }] : []),
    ...(onMarkDeployed ? [{ value: 'deployed', label: 'Mark Deployed' }] : []),
    ...(onDelete ? [{ value: 'delete', label: 'Delete' }] : []),
  ];

  const handleApply = (val: string | null) => {
    if (!val) return;
    if (val === 'delete' && onDelete) onDelete();
    if (val === 'deployed' && onMarkDeployed) onMarkDeployed();
    if (val === 'deployment_started' && onMarkDeploymentStarted) onMarkDeploymentStarted();
  };

  if (options.length === 0) return null;

  return (
    <SelectionBar
      count={count}
      options={options}
      onApply={handleApply}
      onCancel={onCancel}
      placeholder="Select action..."
      applyLabel="Apply"
    />
  );
}

