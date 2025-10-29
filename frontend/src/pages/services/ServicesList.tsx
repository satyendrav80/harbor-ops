/* Purpose: Services placeholder page */
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';

export default function ServicesList() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Services"
        description="Attach application services to servers and credentials to enable deployments."
        action={<Button>Create service</Button>}
      />
      <div className="card p-8 text-center text-sm text-slate-400">
        Service catalog coming soon. Integrate Harbor-Ops with your deployment pipeline to populate this view.
      </div>
    </div>
  );
}
