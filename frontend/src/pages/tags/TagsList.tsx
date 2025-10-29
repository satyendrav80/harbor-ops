/* Purpose: Tags placeholder page */
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';

export default function TagsList() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Tags"
        description="Group servers and services by environment, team, or compliance zone."
        action={<Button>Create tag</Button>}
      />
      <div className="card p-8 text-center text-sm text-slate-400">
        Tag hierarchies will surface here to drive RBAC and release workflows.
      </div>
    </div>
  );
}
