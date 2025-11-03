import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useServices } from '../hooks/useServices';
import { useCreateService, useUpdateService, useDeleteService } from '../hooks/useServiceMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { ServiceModal } from '../components/ServiceModal';
import { Search, Plus, Edit, Trash2, Server as ServerIcon, X } from 'lucide-react';
import type { Service } from '../../../services/services';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useConstants } from '../../constants/hooks/useConstants';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getServers } from '../../../services/servers';

/**
 * Debounce hook to delay search input
 */
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * ServicesPage component for managing services
 */
export function ServicesPage() {
  usePageTitle('Services');
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { data: constants } = useConstants();
  const [searchParams] = useSearchParams();
  const serverIdParam = searchParams.get('serverId');
  const serviceIdParam = searchParams.get('serviceId');
  const serverId = serverIdParam ? Number(serverIdParam) : undefined;
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<Service | null>(null);

  // Fetch servers for filter display
  const { data: serversData } = useQuery({
    queryKey: ['servers', 'filter'],
    queryFn: () => getServers(),
    enabled: !!serverId,
  });

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch services with infinite scroll
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    fetchNextPage: fetchNextServicesPage,
    hasNextPage: hasNextServicesPage,
    isFetchingNextPage: isFetchingNextServicesPage,
  } = useServices(debouncedSearch, 20, serviceId, serverId);

  // Auto-scroll to service if serviceId is in URL (wait for data to load)
  useEffect(() => {
    if (serviceId && servicesData?.pages) {
      // Check if service exists in loaded pages
      const allServices = servicesData.pages.flatMap((page) => page.data);
      const foundService = allServices.find((s) => s.id === serviceId);
      
      if (foundService) {
        // Wait a bit for DOM to update
        setTimeout(() => {
          const element = document.getElementById(`service-${serviceId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
            }, 3000);
          }
        }, 500);
      } else if (hasNextServicesPage && !isFetchingNextServicesPage) {
        // Service might be on next page, try to fetch it
        fetchNextServicesPage();
      }
    }
  }, [serviceId, servicesData, hasNextServicesPage, isFetchingNextServicesPage, fetchNextServicesPage]);

  const deleteService = useDeleteService();

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Service[]>([]);
  
  // Flatten services from all pages
  // Use previous data if current data is undefined (during refetch)
  const services = useMemo(() => {
    if (!servicesData?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = servicesData.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [servicesData]);

  // Infinite scroll observer
  const servicesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextServicesPage ?? false,
    isFetchingNextPage: isFetchingNextServicesPage,
    fetchNextPage: fetchNextServicesPage,
  });

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

  if (servicesLoading && services.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (servicesError) {
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
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Services</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage services running on your servers.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end min-w-[300px]">
          <label className="flex flex-col h-12 w-full max-w-sm">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
                <Search className="w-4 h-4" />
              </div>
              <input
                key="service-search-input"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search services..."
                className="flex-1 px-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-gray-200 dark:border-gray-700/50 border-l-0 rounded-r-lg focus:outline-0 focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </label>
          {hasPermission('services:create') && (
            <button
              onClick={handleCreateService}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className={`bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 transition-all ${
                serviceId && Number(serviceId) === service.id ? 'ring-2 ring-primary ring-opacity-50' : ''
              }`}
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
                                navigate(`/servers?serverId=${ss.server.id}`);
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
                                navigate(`/credentials?serviceId=${service.id}&credentialId=${sc.credential.id}`);
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
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inline Documentation</p>
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_a]:text-primary [&_a]:hover:underline"
                            dangerouslySetInnerHTML={{ __html: service.documentation }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPermission('services:update') && (
                    <button
                      onClick={() => handleEditService(service)}
                      className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                      aria-label="Edit service"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('services:delete') && (
                    <button
                      onClick={() => handleDeleteService(service.id)}
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

