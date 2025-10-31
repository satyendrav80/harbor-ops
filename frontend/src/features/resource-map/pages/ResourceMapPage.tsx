import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResourceMap } from '../../../services/resourceMap';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { HierarchicalMap } from '../components/HierarchicalMap';

/**
 * ResourceMapPage component - displays an interactive hierarchical visualization
 * of all resources and their relationships
 */
export function ResourceMapPage() {
  usePageTitle('Resource Map');

  const { data: resourceMapData, isLoading, error } = useQuery({
    queryKey: ['resource-map'],
    queryFn: getResourceMap,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Calculate stats for display
  const stats = useMemo(() => {
    if (!resourceMapData) return { servers: 0, services: 0, credentials: 0, domains: 0 };
    
    return {
      servers: resourceMapData.servers.length,
      services: resourceMapData.services.length,
      credentials: resourceMapData.credentials.length,
      domains: resourceMapData.domains.length,
    };
  }, [resourceMapData]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          title="Failed to load resource map"
          description="An error occurred while loading the resource map. Please try again later."
        />
      </div>
    );
  }

  if (!resourceMapData || (stats.servers === 0 && stats.services === 0 && stats.credentials === 0 && stats.domains === 0)) {
    return (
      <div className="p-6">
        <EmptyState
          title="No resources found"
          description="There are no resources to display in the map. Create servers, services, credentials, or domains to see them here."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resource Map</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Interactive visualization of all resources and their relationships
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Servers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Services</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Credentials</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Domains</span>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
        {resourceMapData && <HierarchicalMap data={resourceMapData} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-500">{stats.servers}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Servers</div>
        </div>
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">{stats.services}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
        </div>
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-500">{stats.credentials}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Credentials</div>
        </div>
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-500">{stats.domains}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Domains</div>
        </div>
      </div>
    </div>
  );
}
