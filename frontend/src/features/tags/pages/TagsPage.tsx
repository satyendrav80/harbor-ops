import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useTags } from '../hooks/useTags';
import { useDeleteTag } from '../hooks/useTagMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { TagModal } from '../components/TagModal';
import { Search, Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import type { Tag } from '../../../services/tags';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useDebounce } from '../../../hooks/useDebounce';

// Memoized header component - doesn't re-render when data changes
const TagsHeader = memo(({
  searchQuery,
  onSearchChange,
  onCreateClick,
  hasPermission,
}: {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateClick: () => void;
  hasPermission: (permission: string) => boolean;
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div className="flex flex-col">
        <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Tags</p>
        <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
          Manage your tags and metadata.
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
            placeholder="Search tags..."
            className="pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
          />
        </div>
        {hasPermission('tags:create') && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Tag
          </button>
        )}
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.hasPermission === nextProps.hasPermission
  );
});
TagsHeader.displayName = 'TagsHeader';

// Memoized list item component - only re-renders when its own data changes
const TagItem = memo(({
  tag,
  onEdit,
  onDelete,
  hasPermission,
  deletePending,
}: {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: number) => void;
  hasPermission: (permission: string) => boolean;
  deletePending: boolean;
}) => {
  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <TagIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tag.name}</h3>
            {tag.color && (
              <div
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: tag.color }}
                title={`Tag color: ${tag.color}`}
              />
            )}
            {tag.value && (
              <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                {tag.value}
              </span>
            )}
          </div>
          {/* Audit Fields */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <p className="mb-1">Created</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {tag.createdAt ? new Date(tag.createdAt).toLocaleString() : '-'}
                </p>
                {tag.createdByUser && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    by {tag.createdByUser.name || tag.createdByUser.email}
                  </p>
                )}
              </div>
              {tag.updatedAt && (
                <div>
                  <p className="mb-1">Updated</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(tag.updatedAt).toLocaleString()}
                  </p>
                  {tag.updatedByUser && (
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      by {tag.updatedByUser.name || tag.updatedByUser.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {hasPermission('tags:update') && (
            <button
              onClick={() => onEdit(tag)}
              className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
              aria-label="Edit tag"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasPermission('tags:delete') && (
            <button
              onClick={() => onDelete(tag.id)}
              disabled={deletePending}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
              aria-label="Delete tag"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.tag.id === nextProps.tag.id &&
    prevProps.tag.name === nextProps.tag.name &&
    prevProps.tag.value === nextProps.tag.value &&
    prevProps.tag.color === nextProps.tag.color &&
    prevProps.tag.createdAt === nextProps.tag.createdAt &&
    prevProps.deletePending === nextProps.deletePending &&
    prevProps.hasPermission === nextProps.hasPermission
  );
});
TagItem.displayName = 'TagItem';

/**
 * TagsPage component for managing tags
 */
export function TagsPage() {
  usePageTitle('Tags');
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTagForEdit, setSelectedTagForEdit] = useState<Tag | null>(null);

  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch tags with infinite scroll
  const {
    data: tagsData,
    isLoading: tagsLoading,
    error: tagsError,
    fetchNextPage: fetchNextTagsPage,
    hasNextPage: hasNextTagsPage,
    isFetchingNextPage: isFetchingNextTagsPage,
  } = useTags(debouncedSearch, 20);

  const deleteTag = useDeleteTag();

  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Tag[]>([]);
  
  // Flatten tags from all pages
  // Use previous data if current data is undefined (during refetch)
  const tags = useMemo(() => {
    if (!tagsData?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = tagsData.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [tagsData]);

  // Infinite scroll observer
  const tagsObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextTagsPage ?? false,
    isFetchingNextPage: isFetchingNextTagsPage,
    fetchNextPage: fetchNextTagsPage,
  });

  const handleCreateTag = () => {
    setSelectedTagForEdit(null);
    setTagModalOpen(true);
  };

  const handleEditTag = useCallback((tag: Tag) => {
    setSelectedTagForEdit(tag);
    setTagModalOpen(true);
  }, []);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<number | null>(null);

  const handleDeleteTag = useCallback((tagId: number) => {
    setTagToDelete(tagId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteTag = useCallback(async () => {
    if (tagToDelete !== null) {
      try {
        await deleteTag.mutateAsync(tagToDelete);
        setDeleteConfirmOpen(false);
        setTagToDelete(null);
      } catch (err) {
        // Error handled by global error handler
      }
    }
  }, [tagToDelete, deleteTag]);

  if (tagsLoading && tags.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (tagsError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load tags. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header - Memoized, doesn't re-render when data changes */}
      <TagsHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onCreateClick={handleCreateTag}
        hasPermission={hasPermission}
      />

      {/* Tags List */}
      {tags.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title={searchQuery ? 'No tags found' : 'No tags yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first tag to start managing your metadata.'
          }
          action={
            hasPermission('tags:create') && !searchQuery ? (
              <button
                onClick={handleCreateTag}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Tag
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              onEdit={handleEditTag}
              onDelete={handleDeleteTag}
              hasPermission={hasPermission}
              deletePending={deleteTag.isPending}
            />
          ))}
          <div ref={tagsObserverTarget} className="h-4" />
          {isFetchingNextTagsPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Tag Modal */}
      <TagModal
        isOpen={tagModalOpen}
        onClose={() => {
          setTagModalOpen(false);
          setSelectedTagForEdit(null);
        }}
        tag={selectedTagForEdit}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTagToDelete(null);
        }}
        onConfirm={confirmDeleteTag}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTag.isPending}
      />
    </div>
  );
}

