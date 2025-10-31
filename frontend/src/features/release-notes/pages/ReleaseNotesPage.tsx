import { useState, useMemo } from 'react';
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

/**
 * ReleaseNotesPage component for managing release notes
 */
export function ReleaseNotesPage() {
  usePageTitle('Release Notes');
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'deployed' | 'all'>('all');
  const [releaseNoteModalOpen, setReleaseNoteModalOpen] = useState(false);
  const [selectedReleaseNoteForEdit, setSelectedReleaseNoteForEdit] = useState<ReleaseNote | null>(null);

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
    error: releaseNotesError,
    fetchNextPage: fetchNextReleaseNotesPage,
    hasNextPage: hasNextReleaseNotesPage,
    isFetchingNextPage: isFetchingNextReleaseNotesPage,
  } = useReleaseNotes(
    debouncedSearch,
    statusFilter === 'all' ? undefined : statusFilter,
    20
  );

  const createReleaseNote = useCreateReleaseNote();
  const updateReleaseNote = useUpdateReleaseNote();
  const markDeployed = useMarkReleaseNoteDeployed();

  // Flatten release notes from all pages
  const releaseNotes = useMemo(() => {
    return releaseNotesData?.pages.flatMap((page) => page.data) ?? [];
  }, [releaseNotesData]);

  // Infinite scroll observer
  const releaseNotesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextReleaseNotesPage ?? false,
    isFetchingNextPage: isFetchingNextReleaseNotesPage,
    fetchNextPage: fetchNextReleaseNotesPage,
  });

  const handleCreateReleaseNote = () => {
    setSelectedReleaseNoteForEdit(null);
    setReleaseNoteModalOpen(true);
  };

  const handleEditReleaseNote = (releaseNote: ReleaseNote) => {
    setSelectedReleaseNoteForEdit(releaseNote);
    setReleaseNoteModalOpen(true);
  };

  const handleMarkDeployed = async (id: number) => {
    try {
      await markDeployed.mutateAsync(id);
    } catch (err) {
      // Error handled by global error handler
    }
  };

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
      {/* Header */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search release notes..."
              className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
          </div>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'deployed' | 'all')}
            className="px-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="deployed">Deployed</option>
          </select>
          {hasPermission('release-notes:create') && (
            <button
              onClick={handleCreateReleaseNote}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Release Note
            </button>
          )}
        </div>
      </header>

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
        <div className="space-y-4">
          {releaseNotes.map((releaseNote) => (
            <div
              key={releaseNote.id}
              className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6"
            >
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
                          window.location.href = `/services?serviceId=${releaseNote.serviceId}`;
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                        title={`Click to view service ${releaseNote.service.name}`}
                      >
                        <Cloud className="w-3 h-3" />
                        {releaseNote.service.name} (:{releaseNote.service.port})
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
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
                        onClick={() => handleEditReleaseNote(releaseNote)}
                        className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                        aria-label="Edit release note"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMarkDeployed(releaseNote.id)}
                        disabled={markDeployed.isPending}
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
          ))}
          <div ref={releaseNotesObserverTarget} className="h-4" />
          {isFetchingNextReleaseNotesPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
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

