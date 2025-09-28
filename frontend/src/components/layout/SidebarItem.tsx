import { NavLink } from 'react-router-dom';
import { ReactNode } from 'react';

export default function SidebarItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-800 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
