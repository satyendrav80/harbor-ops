/* Purpose: Release Notes workspace */
import Button from '../../components/common/Button';

export default function ReleaseNotesDashboard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Release Notes</h1>
          <p className="text-sm text-slate-400">Track pending deployments and mark services as redeployed once verified.</p>
        </div>
        <Button>Add release note</Button>
      </div>
      <div className="rounded-2xl border border-dashed border-[#2b3857] bg-[#121b31] p-8 text-center text-sm text-slate-400">
        No release notes logged yet. Once CI integrates with Harbor-Ops, pending redeployments will appear here with one-click updates.
      </div>
    </div>
  );
}
