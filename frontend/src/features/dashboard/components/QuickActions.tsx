import { Plus, PlusCircle, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * QuickActions component displaying quick action buttons
 */
export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/servers')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
        <button
          onClick={() => navigate('/services')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/50"
        >
          <PlusCircle className="w-4 h-4" />
          New Service
        </button>
        <button
          onClick={() => navigate('/groups')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/50"
        >
          <FolderPlus className="w-4 h-4" />
          Manage Groups
        </button>
      </div>
    </div>
  );
}

