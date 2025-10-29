/* Purpose: Release Notes workspace */
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';

export default function ReleaseNotesDashboard() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Release Notes"
        description="Track pending deployments and mark services as redeployed once verified."
        action={<Button>Add release note</Button>}
      />
      <div className="card p-8 text-center text-sm text-slate-400">
        No release notes logged yet. Once CI integrates with Harbor-Ops, pending redeployments will appear here with one-click updates.
      </div>
    </div>
  );
}
