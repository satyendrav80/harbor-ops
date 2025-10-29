/* Purpose: Top navigation bar with search + sign-out */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const email = user?.email ?? 'Account';
  const initials = email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase() || 'AO';

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(148,163,184,0.15)] bg-[rgba(11,16,32,0.85)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Harbor-Ops</span>
          <span className="text-lg font-semibold text-white">Operations Console</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            placeholder="Search servers, services…"
            className="hidden rounded-full border border-transparent bg-[#131c33] px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 md:block"
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 rounded-full border border-white/12 bg-[#101a2d] px-2.5 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1a2844] text-xs font-medium uppercase text-slate-100">
                  {initials}
                </span>
                <span className="hidden text-sm font-medium text-slate-100 sm:block">{email}</span>
                <ChevronDown size={16} className="text-slate-500 transition group-hover:text-slate-200" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 mt-2 w-56 rounded-2xl border border-[#1d2a45] bg-[#101a2b] p-2 text-sm text-slate-200 shadow-[0_20px_45px_rgba(8,15,35,0.45)]"
                sideOffset={10}
                collisionPadding={12}
              >
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1a2844] text-xs font-medium uppercase text-slate-100">
                    {initials}
                  </span>
                  <div className="text-sm font-medium text-slate-100">{email}</div>
                </div>
                <DropdownMenu.Separator className="my-2 h-px bg-[#1d2a45]" />
                <DropdownMenu.Item asChild>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-200 transition-colors hover:bg-[#1b2745] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-[#1d2a45]" />
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    logout();
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-red-400 transition-colors hover:bg-[#1b2745] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                >
                  <LogOut size={16} />
                  Sign out
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="fill-[#101a2b]" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
