import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useDomains } from '../hooks/useDomains';
import { useCreateDomain, useUpdateDomain, useDeleteDomain } from '../hooks/useDomainMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { DomainModal } from '../components/DomainModal';
import { Search, Plus, Edit, Trash2, Globe } from 'lucide-react';
import type { Domain } from '../../../services/domains';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';

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
 * DomainsPage component for managing domains
 */
export function DomainsPage() {
  usePageTitle('Domains');
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomainForEdit, setSelectedDomainForEdit] = useState<Domain | null>(null);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch domains with infinite scroll
  const {
    data: domainsData,
    isLoading: domainsLoading,
    error: domainsError,
    fetchNextPage: fetchNextDomainsPage,
    hasNextPage: hasNextDomainsPage,
    isFetchingNextPage: isFetchingNextDomainsPage,
  } = useDomains(debouncedSearch, 20);

  const deleteDomain = useDeleteDomain();

  // Flatten domains from all pages
  const domains = useMemo(() => {
    return domainsData?.pages.flatMap((page) => page.data) ?? [];
  }, [domainsData]);

  // Infinite scroll observer
  const domainsObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextDomainsPage ?? false,
    isFetchingNextPage: isFetchingNextDomainsPage,
    fetchNextPage: fetchNextDomainsPage,
  });

  const handleCreateDomain = () => {
    setSelectedDomainForEdit(null);
    setDomainModalOpen(true);
  };

  const handleEditDomain = (domain: Domain) => {
    setSelectedDomainForEdit(domain);
    setDomainModalOpen(true);
  };

  const handleDeleteDomain = async (domainId: number) => {
    try {
      await deleteDomain.mutateAsync(domainId);
    } catch (err) {
      // Error handled by global error handler
    }
  };

  if (domainsLoading && domains.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (domainsError) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Domains</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage domain names and their associations with servers and services
          </p>
        </div>
        {hasPermission('domains:create') && (
          <button
            onClick={handleCreateDomain}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Plus className="w-4 h-4" />
            Create Domain
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <EmptyState
          icon={<Globe className="w-12 h-12 text-gray-400" />}
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
              className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{domain.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created {new Date(domain.createdAt).toLocaleDateString()}
                    </p>
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
          {isFetchingNextDomainsPage && (
            <div className="flex justify-center py-4">
              <Loading className="h-8" />
            </div>
          )}
        </div>
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
    </div>
  );
}

