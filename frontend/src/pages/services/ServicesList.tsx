/* Purpose: Services placeholder page */
import Button from '../../components/common/Button';

export default function ServicesList() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Services</h1>
          <p className="text-sm text-slate-400">Attach application services to servers and credentials to enable deployments.</p>
        </div>
        <Button>Create service</Button>
      </div>
      <div className="rounded-2xl border border-dashed border-[#2b3857] bg-[#121b31] p-8 text-center text-sm text-slate-400">
        Service catalog coming soon. Integrate Harbor-Ops with your deployment pipeline to populate this view.
      </div>
    </div>
  );
}
