import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from '../common/NotificationBell';
import { LayoutDashboard, Server, Cloud, Lock, Tag, FileText, FolderTree, User, Menu, X, LogOut, Shield, Globe, Network, CheckSquare, Calendar } from 'lucide-react';
import { GlobalApiError } from '../common/GlobalApiError';
import { usePageTitle } from '../../hooks/usePageTitle';
import { TaskDetailsSidePanel } from '../../features/tasks/components/TaskDetailsSidePanel';

type AppLayoutProps = {
  children: React.ReactNode;
};

type NavigationItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string; // resource:view permission required, undefined means always visible (like profile)
};

const allNavigationItems: NavigationItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { name: 'Resource Map', path: '/resource-map', icon: Network, permission: 'servers:view' },
  { name: 'Sprints', path: '/sprints', icon: Calendar, permission: 'sprints:view' },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare, permission: 'tasks:view' },
  { name: 'Servers', path: '/servers', icon: Server, permission: 'servers:view' },
  { name: 'Services', path: '/services', icon: Cloud, permission: 'services:view' },
  { name: 'Credentials', path: '/credentials', icon: Lock, permission: 'credentials:view' },
  { name: 'Tags', path: '/tags', icon: Tag, permission: 'tags:view' },
  { name: 'Release Notes', path: '/release-notes', icon: FileText, permission: 'release-notes:view' },
  { name: 'Groups', path: '/groups', icon: FolderTree, permission: 'groups:view' },
  { name: 'Domains', path: '/domains', icon: Globe, permission: 'domains:view' },
  { name: 'Users & Roles', path: '/users', icon: Shield, permission: 'users:view' },
  { name: 'Profile', path: '/profile', icon: User }, // Profile is always visible
];

/**
 * AppLayout component providing sidebar navigation and topbar
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidePanelTaskId, setSidePanelTaskId] = useState<number | null>(null);
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Update page title based on current route
  usePageTitle();

  // Filter navigation items based on permissions
  const navigation = useMemo(() => {
    return allNavigationItems.filter((item) => {
      // If no permission required, always show (e.g., Profile)
      if (!item.permission) return true;
      // Check if user has the required permission
      return hasPermission(item.permission);
    });
  }, [hasPermission]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-white dark:bg-[#1C252E] flex flex-col border-r border-gray-200 dark:border-gray-700/50 transition-transform h-screen`}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="bg-primary text-white rounded-lg p-2">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Harbor-Ops</h1>
        </div>
        <div className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <p className="text-sm font-medium">{item.name}</p>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-col border-t border-gray-200 dark:border-gray-700/50 p-4 flex-shrink-0">
          <div className="flex gap-3 items-center">
            <div className="bg-primary text-white rounded-full size-10 flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h1 className="text-gray-900 dark:text-white text-sm font-medium leading-normal truncate">{user?.name || 'User'}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 rounded flex-shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white dark:bg-[#1C252E] border-b border-gray-200 dark:border-gray-700/50 px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationBell 
              onTaskClick={(id) => setSidePanelTaskId(id)}
              onReleaseNoteClick={(id) => {
                // Navigate to release notes page with the release note ID
                navigate(`/release-notes?releaseNoteId=${id}`);
              }}
            />
          <ThemeToggle />
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <GlobalApiError />
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Task Details Side Panel */}
      <TaskDetailsSidePanel
        isOpen={sidePanelTaskId !== null}
        onClose={() => setSidePanelTaskId(null)}
        taskId={sidePanelTaskId}
        onTaskClick={(id) => setSidePanelTaskId(id)}
      />
    </div>
  );
}

