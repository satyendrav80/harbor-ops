import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useServers } from '../hooks/useServers';
import { useServersAdvanced } from '../hooks/useServersAdvanced';
import { useCreateServer, useUpdateServer, useDeleteServer } from '../hooks/useServerMutations';
import { revealServerPassword } from '../../../services/servers';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { ServerModal } from '../components/ServerModal';
import { ServerDetailsSidePanel } from '../components/ServerDetailsSidePanel';
import { ServiceDetailsSidePanel } from '../../services/components/ServiceDetailsSidePanel';
import { CredentialDetailsSidePanel } from '../../credentials/components/CredentialDetailsSidePanel';
import { ServerGroups } from '../components/ServerGroups';
import { AdvancedFiltersPanel } from '../../release-notes/components/AdvancedFiltersPanel';
import { Search, Plus, Edit, Trash2, Server as ServerIcon, X, Eye, EyeOff, Cloud, Filter as FilterIcon } from 'lucide-react';
import { ExpandableContent } from '../../../components/common/ExpandableContent';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroups } from '../../../services/groups';
import type { Server } from '../../../services/servers';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { getServersFilterMetadata } from '../../../services/servers';
import { useDebounce } from '../../../hooks/useDebounce';
import type { Filter, OrderByItem, GroupByItem } from '../../release-notes/types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../../release-notes/utils/urlSync';
import { hasActiveFilters } from '../../release-notes/utils/filterState';
import { getSocket } from '../../../services/socket';

/**
 * ServersPage component for managing servers
 */
export function ServersPage() {
  usePageTitle('Servers');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverId = searchParams.get('serverId');
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  
  // Initialize from URL params
  const urlFilters = useMemo(() => deserializeFiltersFromUrl(searchParams), [searchParams]);
  const [advancedFilters, setAdvancedFilters] = useState<Filter | undefined>(urlFilters.filters);
  const [orderBy, setOrderBy] = useState<OrderByItem[] | undefined>(
    Array.isArray(urlFilters.orderBy) ? urlFilters.orderBy : urlFilters.orderBy ? [urlFilters.orderBy] : undefined
  );
  const [groupBy, setGroupBy] = useState<GroupByItem[] | undefined>(urlFilters.groupBy);
  
  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [selectedServerForEdit, setSelectedServerForEdit] = useState<Server | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string | null>>({});
  const [revealingPasswords, setRevealingPasswords] = useState<Record<number, boolean>>({});
  const [expandedDocumentation, setExpandedDocumentation] = useState<Set<number>>(new Set());
  const [sidePanelServerId, setSidePanelServerId] = useState<number | null>(null);
  const [sidePanelServiceId, setSidePanelServiceId] = useState<number | null>(null);
  const [sidePanelCredentialId, setSidePanelCredentialId] = useState<number | null>(null);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['servers', 'filter-metadata'],
    queryFn: () => getServersFilterMetadata(),
  });

  // Real-time invalidation for servers
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries({ queryKey: ['servers'] });
    socket.on('server:changed', refetch);
    return () => {
      socket.off('server:changed', refetch);
    };
  }, [queryClient]);

  // Update filters when URL changes
  useEffect(() => {
    const urlFilters = deserializeFiltersFromUrl(searchParams);
    if (urlFilters.filters) {
      setAdvancedFilters(urlFilters.filters);
    }
    if (urlFilters.orderBy) {
      setOrderBy(Array.isArray(urlFilters.orderBy) ? urlFilters.orderBy : [urlFilters.orderBy]);
    } else {
      setOrderBy(undefined);
    }
    if (urlFilters.groupBy) {
      setGroupBy(urlFilters.groupBy);
    } else {
      setGroupBy(undefined);
    }
  }, [searchParams]);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Determine if we should use advanced filtering
  const useAdvancedFiltering = hasActiveFilters(advancedFilters) || (orderBy && orderBy.length > 0) || (groupBy && groupBy.length > 0);

  // Build orderBy for API - if groupBy exists, prepend group keys to ensure stable ordering
  const apiOrderBy = useMemo(() => {
    const orderByArray: OrderByItem[] = [];
    
    // Prepend groupBy keys to orderBy for stable grouping
    if (groupBy && groupBy.length > 0) {
      groupBy.forEach(gb => {
        orderByArray.push({
          key: gb.key,
          direction: gb.direction || 'asc',
        });
      });
    }
    
    // Add user-specified orderBy
    if (orderBy && orderBy.length > 0) {
      orderBy.forEach(ob => {
        // Skip if already in groupBy
        if (!groupBy || !groupBy.some(gb => gb.key === ob.key)) {
          orderByArray.push(ob);
        }
      });
    }
    
    return orderByArray.length > 0 ? orderByArray : undefined;
  }, [orderBy, groupBy]);

  // Advanced filtering hook
  const {
    data: advancedServersData,
    isLoading: advancedServersLoading,
    isFetching: isFetchingAdvancedServers,
    error: advancedServersError,
    fetchNextPage: fetchNextAdvancedServersPage,
    hasNextPage: hasNextAdvancedServersPage,
    isFetchingNextPage: isFetchingNextAdvancedServersPage,
    refetch: refetchAdvancedServers,
  } = useServersAdvanced(
    {
      filters: advancedFilters,
      search: debouncedSearch || undefined,
      orderBy: apiOrderBy,
    },
    20
  );

  // Legacy filtering hook (for backward compatibility)
  const {
    data: serversData,
    isLoading: serversLoading,
    isFetching: isFetchingServers,
    error: serversError,
    fetchNextPage: fetchNextServersPage,
    hasNextPage: hasNextServersPage,
    isFetchingNextPage: isFetchingNextServersPage,
  } = useServers(debouncedSearch, 20);

  // Choose which data to use
  const serversDataToUse = useAdvancedFiltering ? advancedServersData : serversData;
  const serversLoadingToUse = useAdvancedFiltering ? advancedServersLoading : serversLoading;
  const isFetchingServersToUse = useAdvancedFiltering ? isFetchingAdvancedServers : isFetchingServers;
  const serversErrorToUse = useAdvancedFiltering ? advancedServersError : serversError;
  const fetchNextServersPageToUse = useAdvancedFiltering ? fetchNextAdvancedServersPage : fetchNextServersPage;
  const hasNextServersPageToUse = useAdvancedFiltering ? hasNextAdvancedServersPage : hasNextServersPage;
  const isFetchingNextServersPageToUse = useAdvancedFiltering ? isFetchingNextAdvancedServersPage : isFetchingNextServersPage;

  const deleteServer = useDeleteServer();

  // Fetch all groups to get names (for matching with group IDs)
  const { data: groupsData } = useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => getGroups({ limit: 1000 }),
    enabled: hasPermission('groups:view'),
    staleTime: 5 * 60 * 1000,
  });

  // Create a map of group IDs to group names
  const groupsMap = useMemo(() => {
    if (!groupsData?.data) return new Map<number, string>();
    return new Map(groupsData.data.map((g) => [g.id, g.name]));
  }, [groupsData]);

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Server[]>([]);
  
  // Flatten servers from all pages
  // Use previous data if current data is undefined (during refetch)
  const servers = useMemo(() => {
    if (!serversDataToUse?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = serversDataToUse.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [serversDataToUse]);

  // Infinite scroll observer
  const serversObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextServersPageToUse ?? false,
    isFetchingNextPage: isFetchingNextServersPageToUse,
    fetchNextPage: fetchNextServersPageToUse,
  });

  // Open side panel if serverId is in URL (wait for data to load)
  useEffect(() => {
    if (serverId && serversDataToUse?.pages) {
      // Check if server exists in loaded pages
      const allServers = serversDataToUse.pages.flatMap((page) => page.data);
      const foundServer = allServers.find((s) => s.id === Number(serverId));
      
      if (foundServer) {
        setSidePanelServerId(Number(serverId));
        // Clean up URL param after opening side panel
        const params = new URLSearchParams(searchParams);
        params.delete('serverId');
        setSearchParams(params, { replace: true });
      }
    }
  }, [serverId, serversDataToUse, searchParams, setSearchParams]);

  // Advanced filter handlers
  const handleAdvancedFiltersApply = useCallback((filters: Filter | undefined, newOrderBy?: OrderByItem[], newGroupBy?: GroupByItem[]) => {
    setAdvancedFilters(filters);
    setOrderBy(newOrderBy);
    setGroupBy(newGroupBy);
    // Update URL params
    const params = serializeFiltersToUrl(filters, debouncedSearch || undefined, newOrderBy, newGroupBy);
    setSearchParams(params, { replace: true });
    // Force refetch even if filters are the same (data might have changed on backend)
    if (useAdvancedFiltering) {
      refetchAdvancedServers();
    }
  }, [debouncedSearch, setSearchParams, useAdvancedFiltering, refetchAdvancedServers]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setGroupBy(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleCreateServer = () => {
    setSelectedServerForEdit(null);
    setServerModalOpen(true);
  };

  const handleEditServer = (server: Server) => {
    setSelectedServerForEdit(server);
    setServerModalOpen(true);
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<number | null>(null);

  const handleDeleteServer = (serverId: number) => {
    setServerToDelete(serverId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteServer = async () => {
    if (serverToDelete !== null) {
      try {
        await deleteServer.mutateAsync(serverToDelete);
        setDeleteConfirmOpen(false);
        setServerToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  };

  const handleRevealPassword = async (serverId: number) => {
    // If already revealed, hide it
    if (revealedPasswords[serverId] !== undefined) {
      setRevealedPasswords((prev) => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
      return;
    }

    // Reveal password
    setRevealingPasswords((prev) => ({ ...prev, [serverId]: true }));
    try {
      const response = await revealServerPassword(serverId);
      setRevealedPasswords((prev) => ({ ...prev, [serverId]: response.password }));
    } catch (err) {
      // Error handled by global error handler
    } finally {
      setRevealingPasswords((prev) => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
    }
  };

  if (serversLoadingToUse && servers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (serversErrorToUse) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={ServerIcon}
          title="Failed to load servers"
          description="Unable to fetch servers. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Servers</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage your server infrastructure and SSH connections.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search servers..."
              className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
          </div>
          {/* Advanced Filters Button */}
          <button
            onClick={() => setAdvancedFiltersOpen(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              hasActiveFilters(advancedFilters)
                ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                : 'bg-white dark:bg-[#1C252E] border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            Filters
            {hasActiveFilters(advancedFilters) && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                Active
              </span>
            )}
          </button>
          {hasPermission('servers:create') && (
            <button
              onClick={handleCreateServer}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Server
            </button>
          )}
        </div>
      </header>

      {/* Servers List */}
      {servers.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title={searchQuery ? 'No servers found' : 'No servers yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first server to start managing your infrastructure.'
          }
          action={
            hasPermission('servers:create') && !searchQuery ? (
              <button
                onClick={handleCreateServer}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Server
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.id}
              id={`server-${server.id}`}
              onClick={() => setSidePanelServerId(server.id)}
              className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ServerIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{server.name}</h3>
                    {server.type && (
                      <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                        {server.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">

                    {/* OS/EC2 fields */}
                    {(server.type === 'os' || server.type === 'ec2') && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Public IP</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{server.publicIp || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Private IP</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{server.privateIp || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SSH Port</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{server.sshPort || '-'}</p>
                        </div>
                      </>
                    )}

                    {/* RDS fields */}
                    {server.type === 'rds' && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{server.endpoint || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Port</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{server.port || '-'}</p>
                        </div>
                      </>
                    )}

                    {/* Cloud services (Amplify/Lambda/ECS/Other) fields */}
                    {['amplify', 'lambda', 'ecs', 'other'].includes(server.type || '') && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{server.endpoint || '-'}</p>
                      </div>
                    )}

                    {/* Username field (optional) */}
                    {server.username && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{server.username}</p>
                      </div>
                    )}

                    {/* Password field (always shown if password exists) */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</p>
                      <div className="flex items-center gap-2">
                        {revealedPasswords[server.id] !== undefined ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {revealedPasswords[server.id] || '(no password)'}
                            </code>
                            {hasPermission('credentials:reveal') && (
                              <button
                                onClick={() => handleRevealPassword(server.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                                aria-label="Hide password"
                                title="Hide password"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              ••••••••
                            </code>
                            {hasPermission('credentials:reveal') && (
                              <button
                                onClick={() => handleRevealPassword(server.id)}
                                disabled={revealingPasswords[server.id]}
                                className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 disabled:opacity-50"
                                aria-label="Reveal password"
                                title="Reveal password (requires credentials:reveal permission)"
                              >
                                {revealingPasswords[server.id] ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credentials */}
                    {server.credentials && server.credentials.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credentials</p>
                        <div className="flex flex-wrap gap-2">
                          {server.credentials.map((sc) => (
                            <button
                              key={sc.credential.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSidePanelCredentialId(sc.credential.id);
                              }}
                              className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                              title={`Click to view credential ${sc.credential.name}`}
                            >
                              {sc.credential.name} ({sc.credential.type})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domains */}
                    {server.domains && server.domains.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Domains</p>
                        <div className="flex flex-wrap gap-2">
                          {server.domains.map((sd) => (
                            <a
                              key={sd.domain.id}
                              href={`https://${sd.domain.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer underline"
                              title={`Open ${sd.domain.name} in new tab`}
                            >
                              {sd.domain.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {hasPermission('groups:view') && (
                      <ServerGroups serverId={server.id} groupsMap={groupsMap} />
                    )}
                  </div>
                  
                  {/* Services */}
                  {server.services && server.services.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {server.services.map((ss) => (
                          <button
                            key={ss.service.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                                setSidePanelServiceId(ss.service.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                            title={`Click to view service ${ss.service.name}`}
                          >
                            <Cloud className="w-3 h-3" />
                            {ss.service.name} (:{ss.service.port})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {server.tags && server.tags.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {server.tags.map((serverTag) => (
                          <span
                            key={serverTag.tag.id}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: serverTag.tag.color ? `${serverTag.tag.color}20` : undefined,
                              color: serverTag.tag.color || undefined,
                              border: serverTag.tag.color ? `1px solid ${serverTag.tag.color}` : undefined,
                              ...(!serverTag.tag.color && {
                                backgroundColor: 'rgb(59 130 246 / 0.1)',
                                color: 'rgb(59 130 246)',
                              }),
                            }}
                          >
                            {serverTag.tag.name}
                            {serverTag.tag.value && `: ${serverTag.tag.value}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentation Section */}
                  {(server.documentationUrl || server.documentation) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Documentation & Rules</h4>
                      
                      {server.documentationUrl && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">External Documentation</p>
                          <a
                            href={server.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline break-all inline-flex items-center gap-1"
                          >
                            <span>{server.documentationUrl}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {server.documentation && (
                        <ExpandableContent
                          label="Inline Documentation"
                          placeholder='Click "Expand" to view documentation'
                          isExpanded={expandedDocumentation.has(server.id)}
                          onToggle={(isExpanded) => {
                            setExpandedDocumentation((prev) => {
                              const next = new Set(prev);
                              if (isExpanded) {
                                next.add(server.id);
                              } else {
                                next.delete(server.id);
                              }
                              return next;
                            });
                          }}
                          labelAs="p"
                          labelClassName="text-xs text-gray-500 dark:text-gray-400"
                        >
                          <RichTextRenderer html={server.documentation} />
                        </ExpandableContent>
                      )}
                    </div>
                  )}

                  {/* Audit Fields */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <p className="mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {server.createdAt ? new Date(server.createdAt).toLocaleString() : '-'}
                        </p>
                        {server.createdByUser && (
                          <p className="text-gray-500 dark:text-gray-400 mt-1">
                            by {server.createdByUser.name || server.createdByUser.email}
                          </p>
                        )}
                      </div>
                      {server.updatedAt && (
                        <div>
                          <p className="mb-1">Updated</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {new Date(server.updatedAt).toLocaleString()}
                          </p>
                          {server.updatedByUser && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              by {server.updatedByUser.name || server.updatedByUser.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPermission('servers:update') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditServer(server);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                      aria-label="Edit server"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('servers:delete') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteServer(server.id);
                      }}
                      disabled={deleteServer.isPending}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                      aria-label="Delete server"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={serversObserverTarget} className="h-4" />
          {isFetchingNextServersPageToUse && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="servers"
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          fields={filterMetadata.fields || []}
          filters={advancedFilters}
          orderBy={orderBy}
          groupBy={groupBy}
          onApply={handleAdvancedFiltersApply}
          onClear={handleAdvancedFiltersClear}
        />
      )}

      {/* Server Modal */}
      <ServerModal
        isOpen={serverModalOpen}
        onClose={() => {
          setServerModalOpen(false);
          setSelectedServerForEdit(null);
        }}
        server={selectedServerForEdit}
      />
      <ServerDetailsSidePanel
        isOpen={sidePanelServerId !== null}
        onClose={() => setSidePanelServerId(null)}
        serverId={sidePanelServerId}
        onServerClick={(id) => setSidePanelServerId(id)}
        onServiceClick={(id) => setSidePanelServiceId(id)}
        onCredentialClick={(id) => setSidePanelCredentialId(id)}
      />
      <ServiceDetailsSidePanel
        isOpen={sidePanelServiceId !== null}
        onClose={() => setSidePanelServiceId(null)}
        serviceId={sidePanelServiceId}
        onServiceClick={(id) => setSidePanelServiceId(id)}
        onServerClick={(id) => setSidePanelServerId(id)}
        onCredentialClick={(id) => setSidePanelCredentialId(id)}
      />
      <CredentialDetailsSidePanel
        isOpen={sidePanelCredentialId !== null}
        onClose={() => setSidePanelCredentialId(null)}
        credentialId={sidePanelCredentialId}
        onCredentialClick={(id) => setSidePanelCredentialId(id)}
        onServerClick={(id) => setSidePanelServerId(id)}
        onServiceClick={(id) => setSidePanelServiceId(id)}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setServerToDelete(null);
        }}
        onConfirm={confirmDeleteServer}
        title="Delete Server"
        message="Are you sure you want to delete this server? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteServer.isPending}
      />
    </div>
  );
}

