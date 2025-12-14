import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useServices } from '../hooks/useServices';
import { useServicesAdvanced } from '../hooks/useServicesAdvanced';
import { useCreateService, useUpdateService, useDeleteService } from '../hooks/useServiceMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { ServiceModal } from '../components/ServiceModal';
import { ServiceDetailsSidePanel } from '../components/ServiceDetailsSidePanel';
import { ServerDetailsSidePanel } from '../../servers/components/ServerDetailsSidePanel';
import { CredentialDetailsSidePanel } from '../../credentials/components/CredentialDetailsSidePanel';
import { ServiceGroups } from '../components/ServiceGroups';
import { AdvancedFiltersPanel } from '../../release-notes/components/AdvancedFiltersPanel';
import { Search, Plus, Edit, Trash2, Server as ServerIcon, X, Filter as FilterIcon } from 'lucide-react';
import type { Service } from '../../../services/services';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useConstants } from '../../constants/hooks/useConstants';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServers } from '../../../services/servers';
import { getGroups, getGroupsByItem } from '../../../services/groups';
import { ExpandableContent } from '../../../components/common/ExpandableContent';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { getServicesFilterMetadata } from '../../../services/services';
import { useDebounce } from '../../../hooks/useDebounce';
import type { Filter } from '../../release-notes/types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../../release-notes/utils/urlSync';
import { hasActiveFilters } from '../../release-notes/utils/filterState';
import { getSocket } from '../../../services/socket';

/**
 * ServicesPage component for managing services
 */
export function ServicesPage() {
  usePageTitle('Services');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { data: constants } = useConstants();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverIdParam = searchParams.get('serverId');
  const serviceIdParam = searchParams.get('serviceId');
  const serverId = serverIdParam ? Number(serverIdParam) : undefined;
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  
  // Initialize from URL params
  const urlFilters = useMemo(() => deserializeFiltersFromUrl(searchParams), [searchParams]);
  const [advancedFilters, setAdvancedFilters] = useState<Filter | undefined>(urlFilters.filters);
  const [orderBy, setOrderBy] = useState(urlFilters.orderBy);
  
  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<Service | null>(null);
  const [expandedDocumentation, setExpandedDocumentation] = useState<Set<number>>(new Set());
  const [sidePanelServiceId, setSidePanelServiceId] = useState<number | null>(null);
  const [sidePanelServerId, setSidePanelServerId] = useState<number | null>(null);
  const [sidePanelCredentialId, setSidePanelCredentialId] = useState<number | null>(null);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['services', 'filter-metadata'],
    queryFn: () => getServicesFilterMetadata(),
  });

  // Real-time invalidation for services
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: ['services'] });
    socket.on('service:changed', refetch);
    return () => {
      socket.off('service:changed', refetch);
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

  // Fetch servers for filter display
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'filter'],
    queryFn: () => getServers(),
    enabled: !!serverId,
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

  // Use advanced filtering if advanced filters are active, otherwise use legacy
  const useAdvancedFiltering = hasActiveFilters(advancedFilters) || orderBy !== undefined;
  
  // Advanced filtering hook
  const {
    data: advancedServicesData,
    isLoading: advancedServicesLoading,
    isFetching: isFetchingAdvancedServices,
    error: advancedServicesError,
    fetchNextPage: fetchNextAdvancedServicesPage,
    hasNextPage: hasNextAdvancedServicesPage,
    isFetchingNextPage: isFetchingNextAdvancedServicesPage,
    refetch: refetchAdvancedServices,
  } = useServicesAdvanced(
    {
      filters: advancedFilters,
      search: debouncedSearch || undefined,
      orderBy,
    },
    20
  );

  // Legacy filtering hook (for backward compatibility)
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isFetching: isFetchingServices,
    error: servicesError,
    fetchNextPage: fetchNextServicesPage,
    hasNextPage: hasNextServicesPage,
    isFetchingNextPage: isFetchingNextServicesPage,
  } = useServices(debouncedSearch, 20, serviceId, serverId);

  // Choose which data to use
  const servicesDataToUse = useAdvancedFiltering ? advancedServicesData : servicesData;
  const servicesLoadingToUse = useAdvancedFiltering ? advancedServicesLoading : servicesLoading;
  const isFetchingServicesToUse = useAdvancedFiltering ? isFetchingAdvancedServices : isFetchingServices;
  const servicesErrorToUse = useAdvancedFiltering ? advancedServicesError : servicesError;
  const fetchNextServicesPageToUse = useAdvancedFiltering ? fetchNextAdvancedServicesPage : fetchNextServicesPage;
  const hasNextServicesPageToUse = useAdvancedFiltering ? hasNextAdvancedServicesPage : hasNextServicesPage;
  const isFetchingNextServicesPageToUse = useAdvancedFiltering ? isFetchingNextAdvancedServicesPage : isFetchingNextServicesPage;

  // Open side panel if serviceId is in URL (wait for data to load)
  useEffect(() => {
    if (serviceId && servicesDataToUse?.pages) {
      // Check if service exists in loaded pages
      const allServices = servicesDataToUse.pages.flatMap((page) => page.data);
      const foundService = allServices.find((s) => s.id === serviceId);
      
      if (foundService) {
        setSidePanelServiceId(serviceId);
        // Clean up URL param after opening side panel
        const params = new URLSearchParams(searchParams);
        params.delete('serviceId');
        setSearchParams(params, { replace: true });
      } else if (hasNextServicesPageToUse && !isFetchingNextServicesPageToUse) {
        // Service might be on next page, try to fetch it
        fetchNextServicesPageToUse();
      }
    }
  }, [serviceId, servicesDataToUse, hasNextServicesPageToUse, isFetchingNextServicesPageToUse, fetchNextServicesPageToUse, searchParams, setSearchParams]);

  const deleteService = useDeleteService();

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Service[]>([]);
  
  // Flatten services from all pages
  // Use previous data if current data is undefined (during refetch)
  const services = useMemo(() => {
    if (!servicesDataToUse?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = servicesDataToUse.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [servicesDataToUse]);

  // Infinite scroll observer
  const servicesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextServicesPageToUse ?? false,
    isFetchingNextPage: isFetchingNextServicesPageToUse,
    fetchNextPage: fetchNextServicesPageToUse,
  });

  // Advanced filter handlers
  const handleAdvancedFiltersApply = useCallback((filters: Filter | undefined) => {
    setAdvancedFilters(filters);
    // Update URL params
    const params = serializeFiltersToUrl(filters, debouncedSearch || undefined, orderBy);
    setSearchParams(params, { replace: true });
    // Force refetch even if filters are the same (data might have changed on backend)
    if (useAdvancedFiltering) {
      refetchAdvancedServices();
    }
  }, [debouncedSearch, orderBy, setSearchParams, useAdvancedFiltering, refetchAdvancedServices]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleCreateService = () => {
    setSelectedServiceForEdit(null);
    setServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedServiceForEdit(service);
    setServiceModalOpen(true);
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  const handleDeleteService = (serviceId: number) => {
    setServiceToDelete(serviceId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteService = async () => {
    if (serviceToDelete !== null) {
      try {
        await deleteService.mutateAsync(serviceToDelete);
        setDeleteConfirmOpen(false);
        setServiceToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  };

  if (servicesLoadingToUse && services.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (servicesErrorToUse) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={ServerIcon}
          title="Failed to load services"
          description="Unable to fetch services. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Services</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage services running on your servers.
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
              placeholder="Search services..."
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
          {hasPermission('services:create') && (
            <button
              onClick={handleCreateService}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Service
            </button>
          )}
        </div>
      </header>

      {/* Services List */}
      {services.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title="No services found"
          description={searchQuery ? 'Try adjusting your search query.' : 'Create your first service to get started.'}
        />
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              id={`service-${service.id}`}
              key={service.id}
              onClick={() => setSidePanelServiceId(service.id)}
              className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ServerIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                    {service.external && (
                      <span className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">
                        External
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Port</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{service.port}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Servers</p>
                      <div className="flex flex-wrap gap-2">
                        {service.servers && service.servers.length > 0 ? (
                          service.servers.map((ss) => (
                            <button
                              key={ss.server.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSidePanelServerId(ss.server.id);
                              }}
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer text-left"
                              title={`Click to view server ${ss.server.name}`}
                            >
                              {ss.server.name}
                              {ss.server.type && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                  ({constants?.serverTypeLabels[ss.server.type] || ss.server.type})
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">No servers assigned</span>
                        )}
                      </div>
                    </div>
                    {service.credentials && service.credentials.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credentials</p>
                        <div className="flex flex-wrap gap-2">
                          {service.credentials.map((sc) => (
                            <button
                              key={sc.credential.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSidePanelCredentialId(sc.credential.id);
                              }}
                              className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                              title={`Click to view credential ${sc.credential.name} on credentials page`}
                            >
                              {sc.credential.name} ({sc.credential.type})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {service.domains && service.domains.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Domains</p>
                        <div className="flex flex-wrap gap-2">
                          {service.domains.map((sd) => (
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
                      <ServiceGroups serviceId={service.id} groupsMap={groupsMap} />
                    )}
                    {/* Audit Fields */}
                    <div className="col-span-full">
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                        <div>
                          <p className="mb-1">Created</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {service.createdAt ? new Date(service.createdAt).toLocaleString() : '-'}
                          </p>
                          {service.createdByUser && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              by {service.createdByUser.name || service.createdByUser.email}
                            </p>
                          )}
                        </div>
                        {service.updatedAt && (
                          <div>
                            <p className="mb-1">Updated</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(service.updatedAt).toLocaleString()}
                            </p>
                            {service.updatedByUser && (
                              <p className="text-gray-500 dark:text-gray-400 mt-1">
                                by {service.updatedByUser.name || service.updatedByUser.email}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {service.tags && service.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {service.tags.map((st) => (
                          <span
                            key={st.tag.id}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: st.tag.color ? `${st.tag.color}20` : undefined,
                              color: st.tag.color || undefined,
                              border: st.tag.color ? `1px solid ${st.tag.color}` : undefined,
                              ...(!st.tag.color && {
                                backgroundColor: 'rgb(59 130 246 / 0.1)',
                                color: 'rgb(59 130 246)',
                              }),
                            }}
                          >
                            {st.tag.name}
                            {st.tag.value && `: ${st.tag.value}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Dependencies */}
                  {service.dependencies && service.dependencies.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dependencies</p>
                      <div className="flex flex-wrap gap-2">
                        {service.dependencies.map((dep) => (
                          <div
                            key={dep.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50"
                          >
                            {dep.dependencyService ? (
                              <>
                                <span className="text-blue-500">●</span>
                                <span>
                                  {dep.dependencyService.name} (:{dep.dependencyService.port})
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-purple-500">●</span>
                                <span>
                                  {dep.externalServiceName}
                                  {dep.externalServiceType && ` (${dep.externalServiceType})`}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional service fields */}
                  {(service.sourceRepo || service.appId || service.functionName || service.deploymentUrl) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      {service.sourceRepo && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source/Repo</p>
                          <a
                            href={service.sourceRepo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline break-all"
                          >
                            {service.sourceRepo}
                          </a>
                        </div>
                      )}
                      {service.appId && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">App ID</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{service.appId}</p>
                        </div>
                      )}
                      {service.functionName && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Function Name</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{service.functionName}</p>
                        </div>
                      )}
                      {service.deploymentUrl && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deployment URL</p>
                          <a
                            href={service.deploymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline break-all"
                          >
                            {service.deploymentUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documentation Section */}
                  {(service.documentationUrl || service.documentation) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Documentation & Rules</h4>
                      
                      {service.documentationUrl && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">External Documentation</p>
                          <a
                            href={service.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline break-all inline-flex items-center gap-1"
                          >
                            <span>{service.documentationUrl}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {service.documentation && (
                        <ExpandableContent
                          label="Inline Documentation"
                          placeholder='Click "Expand" to view documentation'
                          isExpanded={expandedDocumentation.has(service.id)}
                          onToggle={(isExpanded) => {
                            setExpandedDocumentation((prev) => {
                              const next = new Set(prev);
                              if (isExpanded) {
                                next.add(service.id);
                              } else {
                                next.delete(service.id);
                              }
                              return next;
                            });
                          }}
                          labelAs="p"
                          labelClassName="text-xs text-gray-500 dark:text-gray-400"
                        >
                          <RichTextRenderer html={service.documentation} />
                        </ExpandableContent>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPermission('services:update') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditService(service);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                      aria-label="Edit service"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('services:delete') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteService(service.id);
                      }}
                      disabled={deleteService.isPending}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                      aria-label="Delete service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Infinite scroll trigger */}
          <div ref={servicesObserverTarget} className="h-4" />
          {isFetchingNextServicesPage && (
            <div className="flex justify-center py-4">
              <Loading className="h-8" />
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="services"
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          fields={filterMetadata.fields || []}
          filters={advancedFilters}
          onApply={handleAdvancedFiltersApply}
          onClear={handleAdvancedFiltersClear}
        />
      )}

      {/* Service Modal */}
      <ServiceModal
        isOpen={serviceModalOpen}
        onClose={() => {
          setServiceModalOpen(false);
          setSelectedServiceForEdit(null);
        }}
        service={selectedServiceForEdit}
        onDelete={() => setSelectedServiceForEdit(null)}
      />
      <ServiceDetailsSidePanel
        isOpen={sidePanelServiceId !== null}
        onClose={() => setSidePanelServiceId(null)}
        serviceId={sidePanelServiceId}
        onServiceClick={(id) => setSidePanelServiceId(id)}
        onServerClick={(id) => setSidePanelServerId(id)}
        onCredentialClick={(id) => setSidePanelCredentialId(id)}
      />
      <ServerDetailsSidePanel
        isOpen={sidePanelServerId !== null}
        onClose={() => setSidePanelServerId(null)}
        serverId={sidePanelServerId}
        onServerClick={(id) => setSidePanelServerId(id)}
        onServiceClick={(id) => setSidePanelServiceId(id)}
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
          setServiceToDelete(null);
        }}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteService.isPending}
      />
    </div>
  );
}

