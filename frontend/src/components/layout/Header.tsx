import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../state/auth';

export default function Header() {
  const { user, setToken, setUser } = useAuth();
  function signOut() {
    setToken(null);
    setUser(null);
  }
  return (
    <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/60">
      <div className="font-semibold">Harbor-Ops</div>
      <div className="flex items-center gap-3">
        <input
          placeholder="Search..."
          className="hidden sm:block rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="text-sm text-slate-200">{user?.email ?? 'Account'}</DropdownMenu.Trigger>
          <DropdownMenu.Content className="mt-2 rounded-md bg-slate-900 border border-slate-700 p-2 text-sm text-slate-200">
            <DropdownMenu.Item className="px-2 py-1 rounded-md hover:bg-slate-800" onSelect={signOut}>Sign out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
