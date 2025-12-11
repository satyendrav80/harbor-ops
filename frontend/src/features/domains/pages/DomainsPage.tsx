import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useDomains } from '../hooks/useDomains';
import { useDomainsAdvanced } from '../hooks/useDomainsAdvanced';
import { useCreateDomain, useUpdateDomain, useDeleteDomain } from '../hooks/useDomainMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { DomainModal } from '../components/DomainModal';
import { DomainDetailsSidePanel } from '../components/DomainDetailsSidePanel';
import { AdvancedFiltersPanel } from '../../release-notes/components/AdvancedFiltersPanel';
import { Search, Plus, Edit, Trash2, Globe, X, Filter as FilterIcon } from 'lucide-react';
import type { Domain } from '../../../services/domains';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroups } from '../../../services/groups';
import { ItemGroups } from '../../../components/common/ItemGroups';
import { ItemTags } from '../../../components/common/ItemTags';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSearchParams } from 'react-router-dom';
import { getDomainsFilterMetadata } from '../../../services/domains';
import type { Filter } from '../../release-notes/types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../../release-notes/utils/urlSync';
import { hasActiveFilters } from '../../release-notes/utils/filterState';
import { getSocket } from '../../../services/socket';


/**
 * DomainsPage component for managing domains
 */
export function DomainsPage() {
  usePageTitle('Domains');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  
  // Initialize from URL params
  const urlFilters = useMemo(() => deserializeFiltersFromUrl(searchParams), [searchParams]);
  const [advancedFilters, setAdvancedFilters] = useState<Filter | undefined>(urlFilters.filters);
  const [orderBy, setOrderBy] = useState(urlFilters.orderBy);
  
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomainForEdit, setSelectedDomainForEdit] = useState<Domain | null>(null);
  const [sidePanelDomainId, setSidePanelDomainId] = useState<number | null>(null);

  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['domains', 'filter-metadata'],
    queryFn: () => getDomainsFilterMetadata(),
  });

  // Real-time invalidation for domains
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    socket.on('domain:changed', refetch);
    return () => {
      socket.off('domain:changed', refetch);
    };
  }, [queryClient]);

  // Update filters when URL changes
  useEffect(() => {
    const urlFilters = deserializeFiltersFromUrl(searchParams);
    if (urlFilters.filters) {
      setAdvancedFilters(urlFilters.filters);
    }
    if (urlFilters.orderBy) {
      setOrderBy(urlFilters.orderBy);
    }
  }, [searchParams]);

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

  // Use advanced filtering if advanced filters are active, otherwise use legacy
  const useAdvancedFiltering = hasActiveFilters(advancedFilters) || orderBy !== undefined;
  
  // Advanced filtering hook
  const {
    data: advancedDomainsData,
    isLoading: advancedDomainsLoading,
    isFetching: isFetchingAdvancedDomains,
    error: advancedDomainsError,
    fetchNextPage: fetchNextAdvancedDomainsPage,
    hasNextPage: hasNextAdvancedDomainsPage,
    isFetchingNextPage: isFetchingNextAdvancedDomainsPage,
    refetch: refetchAdvancedDomains,
  } = useDomainsAdvanced(
    {
      filters: advancedFilters,
      search: debouncedSearch || undefined,
      orderBy,
    },
    20
  );

  // Legacy filtering hook (for backward compatibility)
  const {
    data: domainsData,
    isLoading: domainsLoading,
    isFetching: isFetchingDomains,
    error: domainsError,
    fetchNextPage: fetchNextDomainsPage,
    hasNextPage: hasNextDomainsPage,
    isFetchingNextPage: isFetchingNextDomainsPage,
  } = useDomains(debouncedSearch, 20);

  // Choose which data to use
  const domainsDataToUse = useAdvancedFiltering ? advancedDomainsData : domainsData;
  const domainsLoadingToUse = useAdvancedFiltering ? advancedDomainsLoading : domainsLoading;
  const isFetchingDomainsToUse = useAdvancedFiltering ? isFetchingAdvancedDomains : isFetchingDomains;
  const domainsErrorToUse = useAdvancedFiltering ? advancedDomainsError : domainsError;
  const fetchNextDomainsPageToUse = useAdvancedFiltering ? fetchNextAdvancedDomainsPage : fetchNextDomainsPage;
  const hasNextDomainsPageToUse = useAdvancedFiltering ? hasNextAdvancedDomainsPage : hasNextDomainsPage;
  const isFetchingNextDomainsPageToUse = useAdvancedFiltering ? isFetchingNextAdvancedDomainsPage : isFetchingNextDomainsPage;

  const deleteDomain = useDeleteDomain();

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Domain[]>([]);
  
  // Flatten domains from all pages
  // Use previous data if current data is undefined (during refetch)
  const domains = useMemo(() => {
    if (!domainsDataToUse?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = domainsDataToUse.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [domainsDataToUse]);

  // Infinite scroll observer
  const domainsObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextDomainsPageToUse ?? false,
    isFetchingNextPage: isFetchingNextDomainsPageToUse,
    fetchNextPage: fetchNextDomainsPageToUse,
  });

  // Advanced filter handlers
  const handleAdvancedFiltersApply = useCallback((filters: Filter | undefined) => {
    setAdvancedFilters(filters);
    // Update URL params
    const params = serializeFiltersToUrl(filters, debouncedSearch || undefined, orderBy);
    setSearchParams(params, { replace: true });
    // Force refetch even if filters are the same (data might have changed on backend)
    if (useAdvancedFiltering) {
      refetchAdvancedDomains();
    }
  }, [debouncedSearch, orderBy, setSearchParams, useAdvancedFiltering, refetchAdvancedDomains]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleCreateDomain = () => {
    setSelectedDomainForEdit(null);
    setDomainModalOpen(true);
  };

  const handleEditDomain = (domain: Domain) => {
    setSelectedDomainForEdit(domain);
    setDomainModalOpen(true);
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<number | null>(null);

  const handleDeleteDomain = (domainId: number) => {
    setDomainToDelete(domainId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDomain = async () => {
    if (domainToDelete !== null) {
      try {
        await deleteDomain.mutateAsync(domainToDelete);
        setDeleteConfirmOpen(false);
        setDomainToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  };

  if (domainsLoadingToUse && domains.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (domainsErrorToUse) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load domains. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Domains</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage domain names and their associations with servers and services
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
              placeholder="Search domains..."
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
          {hasPermission('domains:create') && (
            <button
              onClick={handleCreateDomain}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Domain
            </button>
          )}
        </div>
      </header>

      {/* Domains List */}
      {domains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No domains found"
          description={searchQuery ? 'Try adjusting your search query.' : 'Get started by creating a new domain.'}
          action={
            hasPermission('domains:create') ? (
              <button
                onClick={handleCreateDomain}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Create Domain
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              onClick={() => setSidePanelDomainId(domain.id)}
              className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{domain.name}</h3>
                  </div>
                  
                  {/* Groups */}
                  {hasPermission('groups:view') && (
                    <div className="mt-2">
                      <ItemGroups itemType="domain" itemId={domain.id} groupsMap={groupsMap} />
                    </div>
                  )}

                  {/* Tags */}
                  {/* Note: Tags will be shown when backend supports tags for domains */}
                  {domain.tags && domain.tags.length > 0 && (
                    <div className="mt-2">
                      <ItemTags tags={domain.tags} />
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>Created {new Date(domain.createdAt).toLocaleString()}</p>
                    {domain.createdByUser && (
                      <p className="text-gray-400 dark:text-gray-500">by {domain.createdByUser.name || domain.createdByUser.email}</p>
                    )}
                    {domain.updatedAt && (
                      <>
                        <p className="mt-1">Updated {new Date(domain.updatedAt).toLocaleString()}</p>
                        {domain.updatedByUser && (
                          <p className="text-gray-400 dark:text-gray-500">by {domain.updatedByUser.name || domain.updatedByUser.email}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasPermission('domains:update') && (
                    <button
                      onClick={() => handleEditDomain(domain)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {hasPermission('domains:delete') && (
                    <button
                      onClick={() => handleDeleteDomain(domain.id)}
                      disabled={deleteDomain.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Infinite scroll trigger */}
          <div ref={domainsObserverTarget} className="h-4" />
          {isFetchingNextDomainsPageToUse && (
            <div className="flex justify-center py-4">
              <Loading className="h-8" />
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="domains"
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          fields={filterMetadata.fields || []}
          filters={advancedFilters}
          onApply={handleAdvancedFiltersApply}
          onClear={handleAdvancedFiltersClear}
        />
      )}

      {/* Domain Modal */}
      <DomainModal
        isOpen={domainModalOpen}
        onClose={() => {
          setDomainModalOpen(false);
          setSelectedDomainForEdit(null);
        }}
        domain={selectedDomainForEdit}
        onDelete={() => {
          // Domain deleted, no special handling needed
        }}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDomainToDelete(null);
        }}
        onConfirm={confirmDeleteDomain}
        title="Delete Domain"
        message="Are you sure you want to delete this domain? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteDomain.isPending}
      />
    </div>
  );
}

