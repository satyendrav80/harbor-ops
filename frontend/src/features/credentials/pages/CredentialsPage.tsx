import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useCredentials } from '../hooks/useCredentials';
import { useCredentialsAdvanced } from '../hooks/useCredentialsAdvanced';
import { useCreateCredential, useUpdateCredential, useDeleteCredential } from '../hooks/useCredentialMutations';
import { revealCredentialData, getCredentialsFilterMetadata } from '../../../services/credentials';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { CredentialModal } from '../components/CredentialModal';
import { CredentialDetailsSidePanel } from '../components/CredentialDetailsSidePanel';
import { ServerDetailsSidePanel } from '../../servers/components/ServerDetailsSidePanel';
import { ServiceDetailsSidePanel } from '../../services/components/ServiceDetailsSidePanel';
import { AdvancedFiltersPanel } from '../../release-notes/components/AdvancedFiltersPanel';
import { Search, Plus, Edit, Trash2, Key, X, Eye, EyeOff, Server, Cloud, Filter as FilterIcon } from 'lucide-react';
import type { Credential } from '../../../services/credentials';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { getServers } from '../../../services/servers';
import { getServices } from '../../../services/services';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroups } from '../../../services/groups';
import { ItemGroups } from '../../../components/common/ItemGroups';
import { ItemTags } from '../../../components/common/ItemTags';
import { useDebounce } from '../../../hooks/useDebounce';
import type { Filter, OrderByItem, GroupByItem } from '../../release-notes/types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../../release-notes/utils/urlSync';
import { hasActiveFilters } from '../../release-notes/utils/filterState';
import { getSocket } from '../../../services/socket';


/**
 * CredentialsPage component for managing credentials
 */
export function CredentialsPage() {
  usePageTitle('Credentials');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const serverId = searchParams.get('serverId');
  const credentialId = searchParams.get('credentialId');
  const serviceId = searchParams.get('serviceId');
  
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
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [selectedCredentialForEdit, setSelectedCredentialForEdit] = useState<Credential | null>(null);
  const [revealedData, setRevealedData] = useState<Record<number, any>>({});
  const [revealingData, setRevealingData] = useState<Record<number, boolean>>({});
  const [sidePanelCredentialId, setSidePanelCredentialId] = useState<number | null>(null);
  const [sidePanelServerId, setSidePanelServerId] = useState<number | null>(null);
  const [sidePanelServiceId, setSidePanelServiceId] = useState<number | null>(null);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['credentials', 'filter-metadata'],
    queryFn: () => getCredentialsFilterMetadata(),
  });

  // Real-time invalidation for credentials
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    socket.on('credential:changed', refetch);
    return () => {
      socket.off('credential:changed', refetch);
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

  // Fetch servers and services for filter display
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'filter'],
    queryFn: () => getServers(),
    enabled: !!serverId || !!serviceId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', 'filter'],
    queryFn: () => getServices(1, 1000),
    enabled: !!serviceId,
  });

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

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Use advanced filtering if advanced filters/orderBy/groupBy are active, otherwise use legacy
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
    data: advancedCredentialsData,
    isLoading: advancedCredentialsLoading,
    isFetching: isFetchingAdvancedCredentials,
    error: advancedCredentialsError,
    fetchNextPage: fetchNextAdvancedCredentialsPage,
    hasNextPage: hasNextAdvancedCredentialsPage,
    isFetchingNextPage: isFetchingNextAdvancedCredentialsPage,
    refetch: refetchAdvancedCredentials,
  } = useCredentialsAdvanced(
    {
      filters: advancedFilters,
      search: debouncedSearch || undefined,
      orderBy: apiOrderBy,
    },
    20
  );

  // Legacy filtering hook (for backward compatibility)
  const credentialIdNum = credentialId ? Number(credentialId) : undefined;
  const {
    data: credentialsData,
    isLoading: credentialsLoading,
    isFetching: isFetchingCredentials,
    error: credentialsError,
    fetchNextPage: fetchNextCredentialsPage,
    hasNextPage: hasNextCredentialsPage,
    isFetchingNextPage: isFetchingNextCredentialsPage,
  } = useCredentials(debouncedSearch, 20, serverId ? Number(serverId) : undefined, serviceId ? Number(serviceId) : undefined, credentialIdNum);

  // Choose which data to use
  const credentialsDataToUse = useAdvancedFiltering ? advancedCredentialsData : credentialsData;
  const credentialsLoadingToUse = useAdvancedFiltering ? advancedCredentialsLoading : credentialsLoading;
  const isFetchingCredentialsToUse = useAdvancedFiltering ? isFetchingAdvancedCredentials : isFetchingCredentials;
  const credentialsErrorToUse = useAdvancedFiltering ? advancedCredentialsError : credentialsError;
  const fetchNextCredentialsPageToUse = useAdvancedFiltering ? fetchNextAdvancedCredentialsPage : fetchNextCredentialsPage;
  const hasNextCredentialsPageToUse = useAdvancedFiltering ? hasNextAdvancedCredentialsPage : hasNextCredentialsPage;
  const isFetchingNextCredentialsPageToUse = useAdvancedFiltering ? isFetchingNextAdvancedCredentialsPage : isFetchingNextCredentialsPage;

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Credential[]>([]);
  
  // Flatten credentials from all pages
  // Use previous data if current data is undefined (during refetch)
  const credentials = useMemo(() => {
    if (!credentialsDataToUse?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = credentialsDataToUse.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [credentialsDataToUse]);

  // Auto-scroll to credential if credentialId is in URL (wait for data to load)
  useEffect(() => {
    if (credentialIdNum && credentialsData?.pages) {
      // Check if credential exists in loaded pages
      const allCredentials = credentialsData.pages.flatMap((page) => page.data);
      const foundCredential = allCredentials.find((c) => c.id === credentialIdNum);
      
      if (foundCredential) {
        // Wait a bit for DOM to update
        setTimeout(() => {
          const element = document.getElementById(`credential-${credentialIdNum}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
            }, 3000);
          }
        }, 500);
      } else if (hasNextCredentialsPage && !isFetchingNextCredentialsPage) {
        // Credential might be on next page, try to fetch it
        fetchNextCredentialsPage();
      }
    }
  }, [credentialIdNum, credentialsData, hasNextCredentialsPage, isFetchingNextCredentialsPage, fetchNextCredentialsPage]);

  const deleteCredential = useDeleteCredential();

  // Infinite scroll observer
  const credentialsObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextCredentialsPageToUse ?? false,
    isFetchingNextPage: isFetchingNextCredentialsPageToUse,
    fetchNextPage: fetchNextCredentialsPageToUse,
  });

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
      refetchAdvancedCredentials();
    }
  }, [debouncedSearch, setSearchParams, useAdvancedFiltering, refetchAdvancedCredentials]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setGroupBy(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleCreateCredential = () => {
    setSelectedCredentialForEdit(null);
    setCredentialModalOpen(true);
  };

  const handleEditCredential = (credential: Credential) => {
    setSelectedCredentialForEdit(credential);
    setCredentialModalOpen(true);
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<number | null>(null);

  const handleDeleteCredential = (credentialId: number) => {
    setCredentialToDelete(credentialId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteCredential = async () => {
    if (credentialToDelete !== null) {
      try {
        await deleteCredential.mutateAsync(credentialToDelete);
        setDeleteConfirmOpen(false);
        setCredentialToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  };

  const handleRevealData = async (credentialId: number) => {
    // If already revealed, hide it
    if (revealedData[credentialId] !== undefined) {
      setRevealedData((prev) => {
        const newState = { ...prev };
        delete newState[credentialId];
        return newState;
      });
      return;
    }

    // Reveal data
    setRevealingData((prev) => ({ ...prev, [credentialId]: true }));
    try {
      const response = await revealCredentialData(credentialId);
      setRevealedData((prev) => ({ ...prev, [credentialId]: response.data }));
    } catch (err) {
      // Error handled by global error handler
    } finally {
      setRevealingData((prev) => {
        const newState = { ...prev };
        delete newState[credentialId];
        return newState;
      });
    }
  };

  // Open side panel if credentialId is in URL
  useEffect(() => {
    if (credentialId && credentials.length > 0) {
      // Check if credential exists in the loaded list
      const credentialExists = credentials.some((c) => c.id === Number(credentialId));
      if (credentialExists) {
        setSidePanelCredentialId(Number(credentialId));
        // Clean up URL param after opening side panel
        const params = new URLSearchParams(searchParams);
        params.delete('credentialId');
        setSearchParams(params, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId, credentials, searchParams, setSearchParams]);

  if (credentialsLoadingToUse && credentials.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (credentialsErrorToUse) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={Key}
          title="Failed to load credentials"
          description="Unable to fetch credentials. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Credentials</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage your credentials and API keys securely.
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
              placeholder="Search credentials..."
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
          {hasPermission('credentials:create') && (
            <button
              onClick={handleCreateCredential}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Credential
            </button>
          )}
        </div>
      </header>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <EmptyState
          icon={Key}
          title={searchQuery ? 'No credentials found' : 'No credentials yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first credential to start managing your API keys and secrets.'
          }
          action={
            hasPermission('credentials:create') && !searchQuery ? (
              <button
                onClick={handleCreateCredential}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Credential
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {credentials.map((credential) => {
            const isRevealed = revealedData[credential.id] !== undefined;
            const revealed = isRevealed ? revealedData[credential.id] : null;
            const parsedData = typeof credential.data === 'string' ? JSON.parse(credential.data) : credential.data;

            return (
              <div
                key={credential.id}
                id={`credential-${credential.id}`}
                onClick={() => setSidePanelCredentialId(credential.id)}
                className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{credential.name}</h3>
                      <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                        {credential.type}
                      </span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {isRevealed && revealed ? (
                        <div className="space-y-2">
                          {Object.entries(revealed).map(([key, value]) => {
                            const valueStr = String(value);
                            const isMultiline = valueStr.includes('\n');
                            return (
                              <div key={key} className={isMultiline ? "flex flex-col gap-1" : "flex items-center gap-2"}>
                                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[100px]">{key}:</span>
                                {isMultiline ? (
                                  <pre className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all whitespace-pre-wrap overflow-x-auto">
                                    {valueStr}
                                  </pre>
                                ) : (
                                  <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                                    {valueStr}
                                  </code>
                                )}
                              </div>
                            );
                          })}
                          {hasPermission('credentials:reveal') && (
                            <button
                              onClick={() => handleRevealData(credential.id)}
                              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 text-sm"
                              aria-label="Hide data"
                            >
                              <EyeOff className="w-4 h-4 inline mr-1" />
                              Hide
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.keys(parsedData || {}).map((key) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[100px]">{key}:</span>
                              <code className="flex-1 text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                ••••••••
                              </code>
                            </div>
                          ))}
                          {hasPermission('credentials:reveal') && (
                            <button
                              onClick={() => handleRevealData(credential.id)}
                              disabled={revealingData[credential.id]}
                              className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 text-sm disabled:opacity-50"
                              aria-label="Reveal data"
                              title="Reveal credential data (requires credentials:reveal permission)"
                            >
                              {revealingData[credential.id] ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block mr-1" />
                                  Revealing...
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 inline mr-1" />
                                  Reveal
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mapped Servers */}
                    {credential.servers && credential.servers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Used by Servers</p>
                        <div className="flex flex-wrap gap-2">
                          {credential.servers.map((sc) => (
                            <button
                              key={sc.server.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSidePanelServerId(sc.server.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                              title={`Click to view server ${sc.server.name}`}
                            >
                              <Server className="w-3 h-3" />
                              {sc.server.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mapped Services */}
                    {credential.services && credential.services.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Used by Services</p>
                        <div className="flex flex-wrap gap-2">
                          {credential.services.map((sc) => (
                            <button
                              key={sc.service.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/services?serviceId=${sc.service.id}`);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                              title={`Click to view service ${sc.service.name}`}
                            >
                              <Cloud className="w-3 h-3" />
                              {sc.service.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Groups */}
                    {hasPermission('groups:view') && (
                      <div className="mt-4">
                        <ItemGroups itemType="credential" itemId={credential.id} groupsMap={groupsMap} />
                      </div>
                    )}

                    {/* Tags */}
                    {/* Note: Tags will be shown when backend supports tags for credentials */}
                    {credential.tags && credential.tags.length > 0 && (
                      <div className="mt-4">
                        <ItemTags tags={credential.tags} />
                      </div>
                    )}

                    {/* Audit Fields */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div>
                          <p className="mb-1">Created</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {credential.createdAt ? new Date(credential.createdAt).toLocaleString() : '-'}
                          </p>
                          {credential.createdByUser && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              by {credential.createdByUser.name || credential.createdByUser.email}
                            </p>
                          )}
                        </div>
                        {credential.updatedAt && (
                          <div>
                            <p className="mb-1">Updated</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(credential.updatedAt).toLocaleString()}
                            </p>
                            {credential.updatedByUser && (
                              <p className="text-gray-500 dark:text-gray-400 mt-1">
                                by {credential.updatedByUser.name || credential.updatedByUser.email}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {hasPermission('credentials:update') && (
                      <button
                        onClick={() => handleEditCredential(credential)}
                        className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                        aria-label="Edit credential"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('credentials:delete') && (
                      <button
                        onClick={() => handleDeleteCredential(credential.id)}
                        disabled={deleteCredential.isPending}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                        aria-label="Delete credential"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={credentialsObserverTarget} className="h-4" />
          {isFetchingNextCredentialsPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="credentials"
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

      {/* Credential Modal */}
      <CredentialModal
        isOpen={credentialModalOpen}
        onClose={() => {
          setCredentialModalOpen(false);
          setSelectedCredentialForEdit(null);
        }}
        credential={selectedCredentialForEdit}
      />
      <CredentialDetailsSidePanel
        isOpen={sidePanelCredentialId !== null}
        onClose={() => setSidePanelCredentialId(null)}
        credentialId={sidePanelCredentialId}
        onCredentialClick={(id) => setSidePanelCredentialId(id)}
        onServerClick={(id) => setSidePanelServerId(id)}
        onServiceClick={(id) => setSidePanelServiceId(id)}
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
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCredentialToDelete(null);
        }}
        onConfirm={confirmDeleteCredential}
        title="Delete Credential"
        message="Are you sure you want to delete this credential? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteCredential.isPending}
      />
    </div>
  );
}
