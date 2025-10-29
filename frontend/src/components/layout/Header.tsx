/* Purpose: Top navigation bar with search + sign-out */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../state/AuthContext';
import { ChevronDown } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-[rgba(148,163,184,0.15)] bg-[rgba(11,16,32,0.8)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex flex-col">
          <span className="text-sm text-slate-400">Harbor-Ops</span>
          <span className="text-lg font-semibold text-white">Operations Console</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            placeholder="Search servers, services…"
            className="hidden md:block rounded-full bg-[#131c33] border border-transparent px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="flex items-center gap-2 rounded-full bg-[#131c33] px-4 py-2 text-sm text-slate-200 hover:bg-[#1a2742]">
              <span>{user?.email ?? 'Account'}</span>
              <ChevronDown size={16} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="mt-2 w-48 rounded-xl border border-[#20304d] bg-[#121a2e] p-2 text-sm text-slate-200 shadow-xl">
              <DropdownMenu.Item className="rounded-md px-3 py-2 hover:bg-[#1c2843]">Profile</DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[#20304d]" />
              <DropdownMenu.Item
                onSelect={logout}
                className="rounded-md px-3 py-2 text-red-400 hover:bg-[#1c2843] hover:text-red-300"
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
