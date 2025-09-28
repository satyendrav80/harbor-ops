import { LayoutDashboard, Server, Wrench, KeySquare, Tag, StickyNote, Clock, Settings } from 'lucide-react';
import SidebarItem from './SidebarItem';

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 p-3 bg-slate-950/60 border-r border-slate-800 hidden md:block">
      <div className="text-slate-300 text-xs uppercase px-3 mb-2">Navigation</div>
      <nav className="grid gap-1">
        <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <SidebarItem to="/servers" icon={<Server size={18} />} label="Servers" />
        <SidebarItem to="/services" icon={<Wrench size={18} />} label="Services" />
        <SidebarItem to="/credentials" icon={<KeySquare size={18} />} label="Credentials" />
        <SidebarItem to="/tags" icon={<Tag size={18} />} label="Tags" />
        <SidebarItem to="/release-notes" icon={<StickyNote size={18} />} label="Release Notes" />
        <SidebarItem to="/audit" icon={<Clock size={18} />} label="Audit" />
        <SidebarItem to="/settings" icon={<Settings size={18} />} label="Settings" />
      </nav>
    </aside>
  );
}
