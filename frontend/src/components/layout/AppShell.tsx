import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]" style={{ background: 'var(--color-bg)' }}>
      <Header />
      <div className="grid grid-cols-[auto_1fr]">
        <Sidebar />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
