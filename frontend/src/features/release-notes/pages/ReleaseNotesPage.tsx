import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useReleaseNotes } from '../hooks/useReleaseNotes';
import { 
  useCreateReleaseNote, 
  useUpdateReleaseNote, 
  useMarkReleaseNoteDeployed,
  useMarkReleaseNoteDeploymentStarted,
  useDeleteReleaseNote,
  useBulkDeleteReleaseNotes,
  useBulkMarkReleaseNotesDeploymentStarted,
  useBulkMarkReleaseNotesDeployed,
} from '../hooks/useReleaseNoteMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ReleaseNoteModal } from '../components/ReleaseNoteModal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { BulkSelectionToolbar } from '../../../components/common/BulkSelectionToolbar';
import { ExpandableContent } from '../../../components/common/ExpandableContent';
import { Search, Plus, Edit, Trash2, FileText, CheckCircle, Cloud, PlayCircle } from 'lucide-react';
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
  statusFilter: 'pending' | 'deployed' | 'deployment_started' | 'all';
  onStatusFilterChange: (value: 'pending' | 'deployed' | 'deployment_started' | 'all') => void;
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
          onChange={(e) => onStatusFilterChange(e.target.value as 'pending' | 'deployed' | 'deployment_started' | 'all')}
          className="px-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="deployment_started">Deployment Started</option>
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
  onMarkDeploymentStarted,
  onDelete,
  hasPermission,
  markDeployedPending,
  markDeploymentStartedPending,
  deletePending,
  isSelected,
  onSelect,
  onDeselect,
}: {
  releaseNote: ReleaseNote;
  onEdit: (releaseNote: ReleaseNote) => void;
  onMarkDeployed: (id: number) => void;
  onMarkDeploymentStarted: (id: number) => void;
  onDelete: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  markDeployedPending: boolean;
  markDeploymentStartedPending: boolean;
  deletePending: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDeselect: (id: number) => void;
}) => {
  const navigate = useNavigate();
  
  // Strip HTML tags for preview
  const getPlainText = (html: string) => {
    if (typeof document === 'undefined') return html; // SSR safety
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || html;
  };
  
  const plainText = getPlainText(releaseNote.note);
  const preview = plainText.length > 100 ? `${plainText.substring(0, 100)}...` : plainText;
  
  return (
    <div className={`bg-white dark:bg-[#1C252E] border rounded-xl p-6 ${
      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700/50'
    }`}>
      <div className="flex items-start gap-4">
        <label className="flex items-center pt-1 cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelect(releaseNote.id);
              } else {
                onDeselect(releaseNote.id);
              }
            }}
            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words flex-1 min-w-0">
                {preview}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                  releaseNote.status === 'deployed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : releaseNote.status === 'deployment_started'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {releaseNote.status === 'deployment_started' ? 'deployment started' : releaseNote.status}
              </span>
              <div className="flex items-center gap-2">
                {/* Edit button - only for pending notes, requires update permission */}
                {hasPermission('release-notes:update') && releaseNote.status === 'pending' && (
                  <button
                    onClick={() => onEdit(releaseNote)}
                    className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                    aria-label="Edit release note"
                    title="Edit release note"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                
                {/* Delete button - only for pending notes, requires delete permission */}
                {hasPermission('release-notes:delete') && releaseNote.status === 'pending' && (
                  <button
                    onClick={() => onDelete(releaseNote.id)}
                    disabled={deletePending}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Delete release note"
                    title="Delete release note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                {/* Deployment Started button - only for pending notes, requires deploy permission */}
                {hasPermission('release-notes:deploy') && releaseNote.status === 'pending' && (
                  <button
                    onClick={() => onMarkDeploymentStarted(releaseNote.id)}
                    disabled={markDeploymentStartedPending}
                    className="text-gray-400 dark:text-gray-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Mark deployment started"
                    title="Mark deployment started"
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                )}
                
                {/* Mark as Deployed button - for pending or deployment_started notes, requires deploy permission */}
                {hasPermission('release-notes:deploy') && (releaseNote.status === 'pending' || releaseNote.status === 'deployment_started') && (
                  <button
                    onClick={() => onMarkDeployed(releaseNote.id)}
                    disabled={markDeployedPending}
                    className="text-gray-400 dark:text-gray-500 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Mark as deployed"
                    title="Mark as deployed"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <ExpandableContent
              label="Content"
              placeholder='Click "Expand" to view full content'
            >
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_a]:text-primary [&_a]:hover:underline whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: releaseNote.note }}
              />
            </ExpandableContent>
          </div>
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
              <span>
                Created {new Date(releaseNote.createdAt).toLocaleString()}
                {releaseNote.createdByUser && ` by ${releaseNote.createdByUser.name || releaseNote.createdByUser.email}`}
              </span>
            )}
            {releaseNote.updatedAt && (
              <span>
                Updated {new Date(releaseNote.updatedAt).toLocaleString()}
                {releaseNote.updatedByUser && ` by ${releaseNote.updatedByUser.name || releaseNote.updatedByUser.email}`}
              </span>
            )}
          </div>
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
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.markDeployedPending === nextProps.markDeployedPending &&
    prevProps.markDeploymentStartedPending === nextProps.markDeploymentStartedPending &&
    prevProps.deletePending === nextProps.deletePending &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onMarkDeployed === nextProps.onMarkDeployed &&
    prevProps.onMarkDeploymentStarted === nextProps.onMarkDeploymentStarted &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDeselect === nextProps.onDeselect
  );
});
ReleaseNoteItem.displayName = 'ReleaseNoteItem';

// Memoized list container - prevents re-rendering the entire list when individual items change
const ReleaseNotesList = memo(({
  releaseNotes,
  onEdit,
  onMarkDeployed,
  onMarkDeploymentStarted,
  onDelete,
  hasPermission,
  markDeployedPending,
  markDeploymentStartedPending,
  deletePending,
  observerTarget,
  isFetchingNextPage,
  selectedIds,
  onSelect,
  onDeselect,
}: {
  releaseNotes: ReleaseNote[];
  onEdit: (releaseNote: ReleaseNote) => void;
  onMarkDeployed: (id: number) => void;
  onMarkDeploymentStarted: (id: number) => void;
  onDelete: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  markDeployedPending: boolean;
  markDeploymentStartedPending: boolean;
  deletePending: boolean;
  observerTarget: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onDeselect: (id: number) => void;
}) => {
  return (
    <div className="space-y-4">
      {releaseNotes.map((releaseNote) => (
        <ReleaseNoteItem
          key={releaseNote.id}
          releaseNote={releaseNote}
          onEdit={onEdit}
          onMarkDeployed={onMarkDeployed}
          onMarkDeploymentStarted={onMarkDeploymentStarted}
          onDelete={onDelete}
          hasPermission={hasPermission}
          markDeployedPending={markDeployedPending}
          markDeploymentStartedPending={markDeploymentStartedPending}
          deletePending={deletePending}
          isSelected={selectedIds.has(releaseNote.id)}
          onSelect={onSelect}
          onDeselect={onDeselect}
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
  
  // Check if selectedIds changed
  const selectedIdsEqual = 
    prevProps.selectedIds.size === nextProps.selectedIds.size &&
    Array.from(prevProps.selectedIds).every(id => nextProps.selectedIds.has(id));
  
  // Check other props
  return (
    selectedIdsEqual &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onMarkDeployed === nextProps.onMarkDeployed &&
    prevProps.onMarkDeploymentStarted === nextProps.onMarkDeploymentStarted &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.markDeployedPending === nextProps.markDeployedPending &&
    prevProps.markDeploymentStartedPending === nextProps.markDeploymentStartedPending &&
    prevProps.deletePending === nextProps.deletePending &&
    prevProps.isFetchingNextPage === nextProps.isFetchingNextPage &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDeselect === nextProps.onDeselect
  );
});
ReleaseNotesList.displayName = 'ReleaseNotesList';

/**
 * ReleaseNotesPage component for managing release notes
 */
export function ReleaseNotesPage() {
  usePageTitle('Release Notes');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [releaseNoteToDelete, setReleaseNoteToDelete] = useState<number | null>(null);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Read filters from URL params
  const serviceIdParam = searchParams.get('serviceId');
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  
  // Initialize status filter from URL params
  const initialStatusFilter = (searchParams.get('status') as 'pending' | 'deployed' | 'deployment_started' | 'all') || 'all';
  const [statusFilter, setStatusFilter] = useState<'pending' | 'deployed' | 'deployment_started' | 'all'>(initialStatusFilter);
  const [releaseNoteModalOpen, setReleaseNoteModalOpen] = useState(false);
  const [selectedReleaseNoteForEdit, setSelectedReleaseNoteForEdit] = useState<ReleaseNote | null>(null);

  // Update status filter when URL params change
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'pending' || statusParam === 'deployed' || statusParam === 'deployment_started') {
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
  const markDeploymentStarted = useMarkReleaseNoteDeploymentStarted();
  const deleteReleaseNote = useDeleteReleaseNote();
  const bulkDeleteReleaseNotes = useBulkDeleteReleaseNotes();
  const bulkMarkDeploymentStarted = useBulkMarkReleaseNotesDeploymentStarted();
  const bulkMarkDeployed = useBulkMarkReleaseNotesDeployed();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

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
  const handleStatusFilterChange = useCallback((value: 'pending' | 'deployed' | 'deployment_started' | 'all') => {
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

  const handleMarkDeploymentStarted = useCallback(async (id: number) => {
    try {
      await markDeploymentStarted.mutateAsync(id);
    } catch (err) {
      // Error handled by global error handler
    }
  }, [markDeploymentStarted]);

  const handleDeleteReleaseNote = useCallback((id: number) => {
    setReleaseNoteToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteReleaseNote = useCallback(async () => {
    if (releaseNoteToDelete !== null) {
      try {
        await deleteReleaseNote.mutateAsync(releaseNoteToDelete);
        setDeleteConfirmOpen(false);
        setReleaseNoteToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  }, [releaseNoteToDelete, deleteReleaseNote]);

  // Selection handlers
  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleDeselect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(releaseNotes.map((note) => note.id)));
  }, [releaseNotes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, statusFilter, serviceId]);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    setBulkDeleteConfirmOpen(true);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedIds.size > 0) {
      try {
        await bulkDeleteReleaseNotes.mutateAsync(Array.from(selectedIds));
        setSelectedIds(new Set());
        setBulkDeleteConfirmOpen(false);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  }, [selectedIds, bulkDeleteReleaseNotes]);

  const handleBulkMarkDeploymentStarted = useCallback(async () => {
    if (selectedIds.size > 0) {
      try {
        await bulkMarkDeploymentStarted.mutateAsync(Array.from(selectedIds));
        setSelectedIds(new Set());
      } catch (err) {
        // Error handled by global error handler
      }
    }
  }, [selectedIds, bulkMarkDeploymentStarted]);

  const handleBulkMarkDeployed = useCallback(async () => {
    if (selectedIds.size > 0) {
      try {
        await bulkMarkDeployed.mutateAsync(Array.from(selectedIds));
        setSelectedIds(new Set());
      } catch (err) {
        // Error handled by global error handler
      }
    }
  }, [selectedIds, bulkMarkDeployed]);

  // Determine which bulk actions are available based on selected items
  const selectedReleaseNotes = useMemo(() => {
    return releaseNotes.filter((note) => selectedIds.has(note.id));
  }, [releaseNotes, selectedIds]);

  const canBulkDelete = useMemo(() => {
    return selectedReleaseNotes.every((note) => note.status === 'pending');
  }, [selectedReleaseNotes]);

  const canBulkMarkDeploymentStarted = useMemo(() => {
    return selectedReleaseNotes.every((note) => note.status === 'pending');
  }, [selectedReleaseNotes]);

  const canBulkMarkDeployed = useMemo(() => {
    return selectedReleaseNotes.every(
      (note) => note.status === 'pending' || note.status === 'deployment_started'
    );
  }, [selectedReleaseNotes]);

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === releaseNotes.length;
  const isProcessing = bulkDeleteReleaseNotes.isPending || bulkMarkDeploymentStarted.isPending || bulkMarkDeployed.isPending;

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

      {/* Bulk Selection Toolbar - combines select all and bulk actions */}
      {releaseNotes.length > 0 && (
        <BulkSelectionToolbar
          totalCount={releaseNotes.length}
          selectedCount={selectedIds.size}
          isAllSelected={isAllSelected}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onClearSelection={handleDeselectAll}
          isProcessing={isProcessing}
          actions={[
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleBulkDelete,
              variant: 'danger',
              show: hasPermission('release-notes:delete') && canBulkDelete,
            },
            {
              id: 'mark-deployment-started',
              label: 'Mark Deployment Started',
              icon: <PlayCircle className="w-4 h-4" />,
              onClick: handleBulkMarkDeploymentStarted,
              variant: 'primary',
              show: hasPermission('release-notes:deploy') && canBulkMarkDeploymentStarted,
            },
            {
              id: 'mark-deployed',
              label: 'Mark Deployed',
              icon: <CheckCircle className="w-4 h-4" />,
              onClick: handleBulkMarkDeployed,
              variant: 'success',
              show: hasPermission('release-notes:deploy') && canBulkMarkDeployed,
            },
          ]}
        />
      )}

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
          onMarkDeploymentStarted={handleMarkDeploymentStarted}
          onDelete={handleDeleteReleaseNote}
          hasPermission={hasPermission}
          markDeployedPending={markDeployed.isPending}
          markDeploymentStartedPending={markDeploymentStarted.isPending}
          deletePending={deleteReleaseNote.isPending}
          observerTarget={releaseNotesObserverTarget}
          isFetchingNextPage={isFetchingNextReleaseNotesPage}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
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
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setReleaseNoteToDelete(null);
        }}
        onConfirm={confirmDeleteReleaseNote}
        title="Delete Release Note"
        message="Are you sure you want to delete this release note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteReleaseNote.isPending}
      />
      <ConfirmationDialog
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => {
          setBulkDeleteConfirmOpen(false);
        }}
        onConfirm={confirmBulkDelete}
        title="Delete Release Notes"
        message={`Are you sure you want to delete ${selectedIds.size} release note${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkDeleteReleaseNotes.isPending}
      />
    </div>
  );
}

