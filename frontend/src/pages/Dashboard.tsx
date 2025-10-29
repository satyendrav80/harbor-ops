/* Purpose: Landing dashboard with quick links and guidance */
import PageHeader from '../components/common/PageHeader';
import ActionCard from '../components/common/ActionCard';
import { Server, Key, Rocket, ShieldCheck } from 'lucide-react';

const actions = [
  { to: '/servers', label: 'View servers', desc: 'Inspect active nodes, status, and SSH configuration.', icon: <Server size={18} /> },
  { to: '/credentials', label: 'Manage credentials', desc: 'Rotate keys and audit access without leaving Harbor-Ops.', icon: <Key size={18} /> },
  { to: '/release-notes', label: 'Release dashboard', desc: 'Track pending releases and mark redeployments as complete.', icon: <Rocket size={18} /> },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back"
        description="Operate your fleet with confidence. Start with the shortcuts below or explore the sidebar."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => (
          <ActionCard key={a.to} to={a.to} title={a.label} description={a.desc} icon={a.icon} actionLabel="Open" />
        ))}
      </div>
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Ship with guardrails</h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Enable compliance policies, automated credential rotation, and release approval flows to keep operations tight as your infrastructure grows.
          </p>
        </div>
        <ActionCard
          icon={<ShieldCheck size={18} />}
          title="Enable policies"
          description="Configure environment tags and RBAC in minutes."
          actionLabel="Configure"
        />
      </div>
    </div>
  );
}
