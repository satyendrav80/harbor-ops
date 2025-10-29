/* Purpose: Navigation rail with section icons */
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Wrench, KeySquare, Tags, StickyNote, Settings } from 'lucide-react';
import { ReactNode } from 'react';

const items: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/servers', label: 'Servers', icon: <Server size={18} /> },
  { to: '/services', label: 'Services', icon: <Wrench size={18} /> },
  { to: '/credentials', label: 'Credentials', icon: <KeySquare size={18} /> },
  { to: '/tags', label: 'Tags', icon: <Tags size={18} /> },
  { to: '/release-notes', label: 'Release Notes', icon: <StickyNote size={18} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-[rgba(148,163,184,0.1)] bg-[rgba(12,18,34,0.8)] backdrop-blur md:flex md:flex-col">
      <div className="px-6 pt-6 text-xs uppercase tracking-wide text-slate-500">Navigation</div>
      <nav className="mt-3 flex flex-col gap-1 px-3 pb-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-[#1b2745] text-white shadow-inner' : 'text-slate-300 hover:bg-[#152139]'
              }`
            }
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1f2b46] text-slate-200">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
