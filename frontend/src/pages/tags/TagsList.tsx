/* Purpose: Tags placeholder page */
import Button from '../../components/common/Button';

export default function TagsList() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tags</h1>
          <p className="text-sm text-slate-400">Group servers and services by environment, team, or compliance zone.</p>
        </div>
        <Button>Create tag</Button>
      </div>
      <div className="rounded-2xl border border-dashed border-[#2b3857] bg-[#121b31] p-8 text-center text-sm text-slate-400">
        Tag hierarchies will surface here to drive RBAC and release workflows.
      </div>
    </div>
  );
}
