/* Purpose: Landing dashboard with quick links */
import { Link } from 'react-router-dom';
import { Server, Key, Rocket } from 'lucide-react';

const quickLinks = [
  { to: '/servers', label: 'View servers', icon: <Server size={18} /> },
  { to: '/credentials', label: 'Manage credentials', icon: <Key size={18} /> },
  { to: '/release-notes', label: 'Release dashboard', icon: <Rocket size={18} /> },
];

export default function Dashboard() {
  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Track infrastructure health, credentials, and release workflows. Use the shortcuts below to jump to common tasks.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.to} to={item.to} className="card p-5 flex items-center gap-3 hover:border-blue-600 transition-colors">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1f2b46] text-blue-300">
              {item.icon}
            </span>
            <span className="text-sm font-semibold text-white">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
