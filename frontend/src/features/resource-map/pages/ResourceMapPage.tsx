import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResourceMap } from '../../../services/resourceMap';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { HierarchicalMap } from '../components/HierarchicalMap';
import { SearchableMultiSelect } from '../../../components/common/SearchableMultiSelect';
import { getServers } from '../../../services/servers';
import { useConstants } from '../../constants/hooks/useConstants';
import type { ResourceMapData } from '../../../services/resourceMap';

/**
 * ResourceMapPage component - displays an interactive hierarchical visualization
 * of all resources and their relationships
 */
export function ResourceMapPage() {
  usePageTitle('Resource Map');
  const { data: constants } = useConstants();
  const [selectedServerIds, setSelectedServerIds] = useState<number[]>([]);

  const { data: resourceMapData, isLoading, error } = useQuery({
    queryKey: ['resource-map'],
    queryFn: getResourceMap,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch servers for filter
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'filter'],
    queryFn: () => getServers(),
    staleTime: 5 * 60 * 1000,
  });

  // Filter resource map data based on selected servers
  const filteredData = useMemo(() => {
    if (!resourceMapData) return null;
    
    // If no servers selected, show all
    if (selectedServerIds.length === 0) {
      return resourceMapData;
    }

    // Filter servers
    const filteredServers = resourceMapData.servers.filter((server) =>
      selectedServerIds.includes(server.id)
    );

    // Get server IDs for filtering
    const serverIdsSet = new Set(selectedServerIds);

    // Filter services that belong to selected servers
    const filteredServices = resourceMapData.services.filter((service) =>
      service.servers?.some((ss) => serverIdsSet.has(ss.server.id))
    );

    // Filter credentials that belong to selected servers or their services
    const filteredServiceIdsSet = new Set(filteredServices.map((s) => s.id));
    const filteredCredentials = resourceMapData.credentials.filter((credential) => {
      // Include if used by selected servers
      if (credential.servers?.some((sc) => serverIdsSet.has(sc.server.id))) {
        return true;
      }
      // Include if used by filtered services
      if (credential.services?.some((ssc) => filteredServiceIdsSet.has(ssc.service.id))) {
        return true;
      }
      return false;
    });

    // Filter domains that belong to selected servers or their services
    const filteredDomains = resourceMapData.domains.filter((domain) => {
      // Include if used by selected servers
      if (domain.servers?.some((ds) => serverIdsSet.has(ds.server.id))) {
        return true;
      }
      // Include if used by filtered services
      if (domain.services?.some((dsc) => filteredServiceIdsSet.has(dsc.service.id))) {
        return true;
      }
      return false;
    });

    return {
      servers: filteredServers,
      services: filteredServices,
      credentials: filteredCredentials,
      domains: filteredDomains,
    } as ResourceMapData;
  }, [resourceMapData, selectedServerIds]);

  // Calculate stats for display (from filtered data)
  const stats = useMemo(() => {
    if (!filteredData) return { servers: 0, services: 0, credentials: 0, domains: 0 };
    
    return {
      servers: filteredData.servers.length,
      services: filteredData.services.length,
      credentials: filteredData.credentials.length,
      domains: filteredData.domains.length,
    };
  }, [filteredData]);

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
          title={selectedServerIds.length > 0 ? "No resources found for selected servers" : "No resources found"}
          description={
            selectedServerIds.length > 0
              ? "No resources match the selected server filter. Try selecting different servers or clear the filter."
              : "There are no resources to display in the map. Create servers, services, credentials, or domains to see them here."
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resource Map</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Interactive visualization of all resources and their relationships
          </p>
        </div>
        <div className="w-full sm:w-auto min-w-[300px]">
          <SearchableMultiSelect
            options={
              serversData?.data?.map((server) => {
                const serverTypeLabel = constants?.serverTypeLabels[server.type] || server.type;
                const displayName = `${server.name} (${serverTypeLabel}) - ${server.publicIp || server.endpoint || 'N/A'}`;
                return { id: server.id, name: displayName };
              }) || []
            }
            selectedIds={selectedServerIds}
            onChange={setSelectedServerIds}
            label="Filter by Servers"
            placeholder="Select servers to filter (leave empty for all)..."
            disabled={isLoading || !serversData?.data}
          />
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
        {filteredData && <HierarchicalMap data={filteredData} />}
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
