import { Plus, PlusCircle, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { memo, useMemo } from 'react';

/**
 * QuickActions component displaying quick action buttons
 * Memoized to prevent unnecessary re-renders
 */
export const QuickActions = memo(function QuickActions() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const actions = useMemo(() => [
    {
      label: 'Add Server',
      path: '/servers',
      icon: Plus,
      permission: 'servers:view',
      primary: true,
    },
    {
      label: 'New Service',
      path: '/services',
      icon: PlusCircle,
      permission: 'services:view',
      primary: false,
    },
    {
      label: 'Manage Groups',
      path: '/groups',
      icon: FolderPlus,
      permission: 'groups:view',
      primary: false,
    },
  ].filter((action) => hasPermission(action.permission)), [hasPermission]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="flex flex-col gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                action.primary
                  ? 'text-white bg-primary hover:bg-primary/90 focus:ring-primary/50'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 focus:ring-gray-500/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});
QuickActions.displayName = 'QuickActions';

