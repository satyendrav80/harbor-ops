import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useReleaseNotes } from '../hooks/useReleaseNotes';
import { useCreateReleaseNote, useUpdateReleaseNote, useMarkReleaseNoteDeployed } from '../hooks/useReleaseNoteMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ReleaseNoteModal } from '../components/ReleaseNoteModal';
import { Search, Plus, Edit, Trash2, FileText, CheckCircle, Cloud } from 'lucide-react';
import type { ReleaseNote } from '../../../services/releaseNotes';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useDebounce } from '../../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '../../../services/services';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Memoized header component - doesn't re-render when data changes
const ReleaseNotesHeader = memo(({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateClick,
  hasPermission,
}: {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: 'pending' | 'deployed' | 'all';
  onStatusFilterChange: (value: 'pending' | 'deployed' | 'all') => void;
  onCreateClick: () => void;
  hasPermission: (permission: string) => boolean;
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div className="flex flex-col">
        <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Release Notes</p>
        <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
          Manage your release notes and deployment status.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search release notes..."
            className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
          />
        </div>
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'pending' | 'deployed' | 'all')}
          className="px-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="deployed">Deployed</option>
        </select>
        {hasPermission('release-notes:create') && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Release Note
          </button>
        )}
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return (
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.statusFilter === nextProps.statusFilter &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.onSearchChange === nextProps.onSearchChange &&
    prevProps.onStatusFilterChange === nextProps.onStatusFilterChange &&
    prevProps.onCreateClick === nextProps.onCreateClick
  );
});
ReleaseNotesHeader.displayName = 'ReleaseNotesHeader';

// Memoized list item component - only re-renders when its own data changes
const ReleaseNoteItem = memo(({
  releaseNote,
  onEdit,
  onMarkDeployed,
  hasPermission,
  markDeployedPending,
}: {
  releaseNote: ReleaseNote;
  onEdit: (releaseNote: ReleaseNote) => void;
  onMarkDeployed: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  markDeployedPending: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {releaseNote.note.length > 100
                ? `${releaseNote.note.substring(0, 100)}...`
                : releaseNote.note}
            </h3>
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                releaseNote.status === 'deployed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {releaseNote.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
            {releaseNote.note}
          </p>
          {/* Service Link */}
          {releaseNote.service && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Service</p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/services?serviceId=${releaseNote.serviceId}`);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                title={`Click to view service ${releaseNote.service.name}`}
              >
                <Cloud className="w-3 h-3" />
                {releaseNote.service.name} (:{releaseNote.service.port})
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            {releaseNote.publishDate && (
              <span className="font-medium">
                Publish Date: {new Date(releaseNote.publishDate).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {releaseNote.createdAt && (
              <span>Created {new Date(releaseNote.createdAt).toLocaleDateString()}</span>
            )}
            {releaseNote.updatedAt && (
              <span>Updated {new Date(releaseNote.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {hasPermission('release-notes:update') && releaseNote.status === 'pending' && (
            <>
              <button
                onClick={() => onEdit(releaseNote)}
                className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                aria-label="Edit release note"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMarkDeployed(releaseNote.id)}
                disabled={markDeployedPending}
                className="text-gray-400 dark:text-gray-500 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded p-1 disabled:opacity-50"
                aria-label="Mark as deployed"
                title="Mark as deployed"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - return true if props are equal (skip re-render)
  const releaseNoteEqual = 
    prevProps.releaseNote.id === nextProps.releaseNote.id &&
    prevProps.releaseNote.note === nextProps.releaseNote.note &&
    prevProps.releaseNote.status === nextProps.releaseNote.status &&
    prevProps.releaseNote.publishDate === nextProps.releaseNote.publishDate &&
    prevProps.releaseNote.createdAt === nextProps.releaseNote.createdAt &&
    prevProps.releaseNote.updatedAt === nextProps.releaseNote.updatedAt &&
    prevProps.releaseNote.serviceId === nextProps.releaseNote.serviceId;
  
  // Compare service object (check if both are null/undefined or both have same id)
  const serviceEqual = 
    (!prevProps.releaseNote.service && !nextProps.releaseNote.service) ||
    (prevProps.releaseNote.service?.id === nextProps.releaseNote.service?.id &&
     prevProps.releaseNote.service?.name === nextProps.releaseNote.service?.name &&
     prevProps.releaseNote.service?.port === nextProps.releaseNote.service?.port);
  
  return (
    releaseNoteEqual &&
    serviceEqual &&
    prevProps.markDeployedPending === nextProps.markDeployedPending &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onMarkDeployed === nextProps.onMarkDeployed
  );
});
ReleaseNoteItem.displayName = 'ReleaseNoteItem';

// Memoized list container - prevents re-rendering the entire list when individual items change
const ReleaseNotesList = memo(({
  releaseNotes,
  onEdit,
  onMarkDeployed,
  hasPermission,
  markDeployedPending,
  observerTarget,
  isFetchingNextPage,
}: {
  releaseNotes: ReleaseNote[];
  onEdit: (releaseNote: ReleaseNote) => void;
  onMarkDeployed: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  markDeployedPending: boolean;
  observerTarget: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
}) => {
  return (
    <div className="space-y-4">
      {releaseNotes.map((releaseNote) => (
        <ReleaseNoteItem
          key={releaseNote.id}
          releaseNote={releaseNote}
          onEdit={onEdit}
          onMarkDeployed={onMarkDeployed}
          hasPermission={hasPermission}
          markDeployedPending={markDeployedPending}
        />
      ))}
      <div ref={observerTarget} className="h-4" />
      {isFetchingNextPage && (
        <div className="p-4 text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the array length changed or if item IDs changed
  if (prevProps.releaseNotes.length !== nextProps.releaseNotes.length) {
    return false;
  }
  
  // Check if any item IDs changed
  const prevIds = prevProps.releaseNotes.map(n => n.id).sort().join(',');
  const nextIds = nextProps.releaseNotes.map(n => n.id).sort().join(',');
  if (prevIds !== nextIds) {
    return false;
  }
  
  // Check other props
  return (
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onMarkDeployed === nextProps.onMarkDeployed &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.markDeployedPending === nextProps.markDeployedPending &&
    prevProps.isFetchingNextPage === nextProps.isFetchingNextPage
  );
});
ReleaseNotesList.displayName = 'ReleaseNotesList';

/**
 * ReleaseNotesPage component for managing release notes
 */
export function ReleaseNotesPage() {
  usePageTitle('Release Notes');
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Read filters from URL params
  const serviceIdParam = searchParams.get('serviceId');
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  
  // Initialize status filter from URL params
  const initialStatusFilter = (searchParams.get('status') as 'pending' | 'deployed' | 'all') || 'all';
  const [statusFilter, setStatusFilter] = useState<'pending' | 'deployed' | 'all'>(initialStatusFilter);
  const [releaseNoteModalOpen, setReleaseNoteModalOpen] = useState(false);
  const [selectedReleaseNoteForEdit, setSelectedReleaseNoteForEdit] = useState<ReleaseNote | null>(null);

  // Update status filter when URL params change
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'pending' || statusParam === 'deployed') {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter('all');
    }
  }, [searchParams]);

  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch services for creating release notes
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'list'],
    queryFn: () => getServices(1, 1000),
  });

  // Fetch release notes with infinite scroll
  const {
    data: releaseNotesData,
    isLoading: releaseNotesLoading,
    isFetching: isFetchingReleaseNotes,
    error: releaseNotesError,
    fetchNextPage: fetchNextReleaseNotesPage,
    hasNextPage: hasNextReleaseNotesPage,
    isFetchingNextPage: isFetchingNextReleaseNotesPage,
  } = useReleaseNotes(
    debouncedSearch,
    statusFilter === 'all' ? undefined : statusFilter,
    20,
    serviceId
  );

  const createReleaseNote = useCreateReleaseNote();
  const updateReleaseNote = useUpdateReleaseNote();
  const markDeployed = useMarkReleaseNoteDeployed();

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<ReleaseNote[]>([]);
  
  // Flatten release notes from all pages
  // Use previous data if current data is undefined (during refetch)
  const releaseNotes = useMemo(() => {
    if (!releaseNotesData?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = releaseNotesData.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [releaseNotesData]);

  // Infinite scroll observer
  const releaseNotesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextReleaseNotesPage ?? false,
    isFetchingNextPage: isFetchingNextReleaseNotesPage,
    fetchNextPage: fetchNextReleaseNotesPage,
  });

  // Memoize handlers to prevent re-renders - MUST be called before any conditional returns
  const handleStatusFilterChange = useCallback((value: 'pending' | 'deployed' | 'all') => {
    setStatusFilter(value);
    // Update URL params
    if (value === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ status: value }, { replace: true });
    }
  }, [setSearchParams]);

  const handleCreateReleaseNote = useCallback(() => {
    setSelectedReleaseNoteForEdit(null);
    setReleaseNoteModalOpen(true);
  }, []);

  const handleEditReleaseNote = useCallback((releaseNote: ReleaseNote) => {
    setSelectedReleaseNoteForEdit(releaseNote);
    setReleaseNoteModalOpen(true);
  }, []);

  const handleMarkDeployed = useCallback(async (id: number) => {
    try {
      await markDeployed.mutateAsync(id);
    } catch (err) {
      // Error handled by global error handler
    }
  }, [markDeployed]);

  // Only show loading on initial load when there's truly no data
  // placeholderData keeps previous data during refetches, so we don't flicker
  if (releaseNotesLoading && releaseNotes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (releaseNotesError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load release notes. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header - Memoized, doesn't re-render when data changes */}
      <ReleaseNotesHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onCreateClick={handleCreateReleaseNote}
        hasPermission={hasPermission}
      />

      {/* Release Notes List */}
      {releaseNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || statusFilter !== 'all' ? 'No release notes found' : 'No release notes yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or clearing filters.'
              : 'Create your first release note to start tracking deployments.'
          }
          action={
            hasPermission('release-notes:create') && !searchQuery && statusFilter === 'all' ? (
              <button
                onClick={handleCreateReleaseNote}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Release Note
              </button>
            ) : null
          }
        />
      ) : (
        <ReleaseNotesList
          releaseNotes={releaseNotes}
          onEdit={handleEditReleaseNote}
          onMarkDeployed={handleMarkDeployed}
          hasPermission={hasPermission}
          markDeployedPending={markDeployed.isPending}
          observerTarget={releaseNotesObserverTarget}
          isFetchingNextPage={isFetchingNextReleaseNotesPage}
        />
      )}

      {/* Release Note Modal */}
      <ReleaseNoteModal
        isOpen={releaseNoteModalOpen}
        onClose={() => {
          setReleaseNoteModalOpen(false);
          setSelectedReleaseNoteForEdit(null);
        }}
        releaseNote={selectedReleaseNoteForEdit}
        services={servicesData?.data || []}
      />
    </div>
  );
}

