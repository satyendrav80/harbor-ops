/* Purpose: Shared layout with header + sidebar */
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),transparent_55%)]" style={{ backgroundColor: 'var(--bg)' }}>
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
