import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useSidePanelSync } from '../../../hooks/useSidePanelSync';
import { useReleaseNotes } from '../hooks/useReleaseNotes';
import { useReleaseNotesAdvanced } from '../hooks/useReleaseNotesAdvanced';
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
import { ShareLinkModal } from '../components/ShareLinkModal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { SelectionBar } from '../../../components/common/SelectionBar';
import { ExpandableContent } from '../../../components/common/ExpandableContent';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { isEmptyHtml } from '../../../utils/richText';
import { AdvancedFiltersPanel } from '../components/AdvancedFiltersPanel';
import { Search, Plus, Edit, Trash2, FileText, CheckCircle, Cloud, PlayCircle, Filter as FilterIcon, Share2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ReleaseNote } from '../../../services/releaseNotes';
import { getReleaseNotesFilterMetadata } from '../../../services/releaseNotes';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { useDebounce } from '../../../hooks/useDebounce';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '../../../services/services';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import type { Filter, OrderByItem, GroupByItem } from '../types/filters';
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '../utils/urlSync';
import { hasActiveFilters } from '../utils/filterState';
import { groupReleaseNoteTasks } from '../utils/groupReleaseNoteTasks';
import { GroupedList } from '../../../components/common/grouping/GroupedList';
import type { GroupNode } from '../../../types/grouping';
import { TaskDetailsSidePanel } from '../../tasks/components/TaskDetailsSidePanel';
import { ServiceDetailsSidePanel } from '../../services/components/ServiceDetailsSidePanel';
import { ReleaseNoteDetailsSidePanel } from '../components/ReleaseNoteDetailsSidePanel';
import { formatLocal, formatLocalDetailed } from '../../../utils/dateTime';
import { toast } from 'react-hot-toast';
import { getSocket } from '../../../services/socket';


// Memoized header component - doesn't re-render when data changes
const ReleaseNotesHeader = memo(({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateClick,
  onAdvancedFiltersClick,
  onShareClick,
  hasActiveAdvancedFilters,
  hasPermission,
}: {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: 'pending' | 'deployed' | 'deployment_started' | 'all';
  onStatusFilterChange: (value: 'pending' | 'deployed' | 'deployment_started' | 'all') => void;
  onCreateClick: () => void;
  onAdvancedFiltersClick: () => void;
  onShareClick: () => void;
  hasActiveAdvancedFilters: boolean;
  hasPermission: (permission: string) => boolean;
}) => {
  return (
    <header className="flex flex-col gap-4 mb-8">
      <div className="flex flex-col">
        <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Release Notes</p>
        <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
          Manage your release notes and deployment status.
        </p>
      </div>
      <div className="flex items-center gap-3 justify-end">
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
        {/* Advanced Filters Button */}
        <button
          onClick={onAdvancedFiltersClick}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            hasActiveAdvancedFilters
              ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
              : 'bg-white dark:bg-[#1C252E] border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FilterIcon className="w-4 h-4" />
          Filters
          {hasActiveAdvancedFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
              Active
            </span>
          )}
        </button>
        {hasPermission('release-notes:create') && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Release Note
          </button>
        )}
        <Link
          to="/release-notes/share-links"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Manage share links"
        >
          <Share2 className="w-4 h-4" />
          Manage Links
        </Link>
        <button
          onClick={onShareClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Create public share link"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return (
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.statusFilter === nextProps.statusFilter &&
    prevProps.hasActiveAdvancedFilters === nextProps.hasActiveAdvancedFilters &&
    prevProps.hasPermission === nextProps.hasPermission &&
    prevProps.onSearchChange === nextProps.onSearchChange &&
    prevProps.onStatusFilterChange === nextProps.onStatusFilterChange &&
    prevProps.onCreateClick === nextProps.onCreateClick &&
    prevProps.onAdvancedFiltersClick === nextProps.onAdvancedFiltersClick
  );
});
ReleaseNotesHeader.displayName = 'ReleaseNotesHeader';

// Memoized list item component - only re-renders when its own data changes
const ReleaseNoteItem = memo(({
  releaseNote,
  onView,
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
  onTaskClick,
  onServiceClick,
}: {
  releaseNote: ReleaseNote;
  onView: (releaseNote: ReleaseNote) => void;
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
  onTaskClick?: (taskId: number) => void;
  onServiceClick?: (serviceId: number) => void;
}) => {
  const navigate = useNavigate();
  
  // Strip HTML tags for preview
  const getPlainText = (html: string) => {
    // First check if the HTML is effectively empty
    if (!html || isEmptyHtml(html)) {
      return '';
    }
    
    if (typeof document === 'undefined') return html; // SSR safety
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || html;
  };
  
  const plainText = getPlainText(releaseNote.note);
  const preview = plainText.length > 100 ? `${plainText.substring(0, 100)}...` : plainText;
  const { primaryTasks, otherTasks } = groupReleaseNoteTasks(releaseNote.tasks, releaseNote.serviceId);
  const typeIcons: Record<string, string> = {
    bug: '🐛',
    feature: '✨',
    todo: '📝',
    epic: '🎯',
    improvement: '⚡',
  };

  const renderTask = (
    releaseNoteTask: NonNullable<ReleaseNote['tasks']>[number],
    showServiceBadge?: boolean
  ) => {
    const task = releaseNoteTask.task;
    if (!task) return null;
    return (
      <div key={task.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcons[task.type] || '📝'}</span>
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h5>
          {showServiceBadge && (
            <span className="ml-auto text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {task.service?.name || 'Other service'}
            </span>
          )}
        </div>
        {task.description && (
          <div className="ml-6">
            <RichTextRenderer html={task.description} variant="muted" />
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 ml-6">
          <span>
            Status: <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </span>
          {task.sprint && (
            <span>
              Sprint: <span className="font-medium">{task.sprint.name}</span>
            </span>
          )}
        </div>
      </div>
    );
  };
  
  return (
            <div
              className={`bg-white dark:bg-[#1C252E] border rounded-xl p-6 pt-10 relative group ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700/50'
              }`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                  e.stopPropagation();
                  if (isSelected) onDeselect(releaseNote.id);
                  else onSelect(releaseNote.id);
                } else {
                  onView(releaseNote);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onView(releaseNote);
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className={`absolute top-3 left-3 z-10 flex items-center gap-2 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      onSelect(releaseNote.id);
                    } else {
                      onDeselect(releaseNote.id);
                    }
                  }}
                  className="w-4 h-4 text-primary bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:ring-2"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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

                {hasPermission('release-notes:update') && releaseNote.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(releaseNote);
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                    aria-label="Edit release note"
                    title="Edit release note"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {hasPermission('release-notes:delete') && releaseNote.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(releaseNote.id);
                    }}
                    disabled={deletePending}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Delete release note"
                    title="Delete release note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {hasPermission('release-notes:deploy') && releaseNote.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDeploymentStarted(releaseNote.id);
                    }}
                    disabled={markDeploymentStartedPending}
                    className="text-gray-400 dark:text-gray-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Mark deployment started"
                    title="Mark deployment started"
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                )}

                {hasPermission('release-notes:deploy') && (releaseNote.status === 'pending' || releaseNote.status === 'deployment_started') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDeployed(releaseNote.id);
                    }}
                    disabled={markDeployedPending}
                    className="text-gray-400 dark:text-gray-500 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded p-1 disabled:opacity-50"
                    aria-label="Mark as deployed"
                    title="Mark as deployed"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 pr-24">
          <div className="flex items-start gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words flex-1 min-w-0">
                {preview}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" />
          </div>
          <div className="mt-2">
            <ExpandableContent
              label="Content"
              placeholder='Click "Expand" to view full content'
            >
              <div className="space-y-4">
                {/* Note Content - Shown First */}
                {releaseNote.note && (
                  <RichTextRenderer html={releaseNote.note} />
                )}
                
                {/* Tasks List - Shown Below Note Content */}
                {(primaryTasks.length > 0 || otherTasks.length > 0) && (
                  <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Added Tasks
                    </h4>
                    {primaryTasks.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {releaseNote.service?.name
                            ? `Tasks for ${releaseNote.service.name}`
                            : 'Primary Service'}
                        </p>
                        {primaryTasks.map((releaseNoteTask) => renderTask(releaseNoteTask))}
                      </div>
                    )}
                    {otherTasks.length > 0 && (
                      <div
                        className={`space-y-3 ${
                          primaryTasks.length > 0
                            ? 'pt-4 border-t border-gray-200 dark:border-gray-700'
                            : ''
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Other Services
                        </p>
                        {otherTasks.map((releaseNoteTask) => renderTask(releaseNoteTask, true))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                  onServiceClick?.(releaseNote.serviceId);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                title={`Click to view service ${releaseNote.service.name}`}
              >
                <Cloud className="w-3 h-3" />
                {releaseNote.service.name} (:{releaseNote.service.port})
              </button>
            </div>
          )}
          
          {/* Related Tasks */}
          {releaseNote.tasks && releaseNote.tasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Related Tasks</p>
              <div className="flex flex-wrap gap-2">
                {releaseNote.tasks.map((releaseNoteTask) => {
                  const task = releaseNoteTask.task;
                  const typeIcons: Record<string, string> = {
                    bug: '🐛',
                    feature: '✨',
                    todo: '📝',
                    epic: '🎯',
                    improvement: '⚡',
                  };
                  return (
                    <button
                      key={task.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTaskClick?.(task.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      title={`Click to view task: ${task.title}`}
                    >
                      <span>{typeIcons[task.type] || '📝'}</span>
                      <span className="truncate max-w-[200px]">{task.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            {releaseNote.publishDate && (
              <span className="font-medium">
                Publish Date: {formatLocal(releaseNote.publishDate)}
              </span>
            )}
            {releaseNote.deployedAt && (
              <span className="font-medium text-green-700 dark:text-green-300">
                Deployed: {formatLocal(releaseNote.deployedAt)}
              </span>
            )}
            {releaseNote.createdAt && (
              <span>
                Created {formatLocalDetailed(releaseNote.createdAt)}
                {releaseNote.createdByUser && ` by ${releaseNote.createdByUser.name || releaseNote.createdByUser.email}`}
              </span>
            )}
            {releaseNote.updatedAt && (
              <span>
                Updated {formatLocalDetailed(releaseNote.updatedAt)}
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
    prevProps.releaseNote.deployedAt === nextProps.releaseNote.deployedAt &&
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
  onView,
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
  onTaskClick,
  onServiceClick,
}: {
  releaseNotes: ReleaseNote[];
  onView: (releaseNote: ReleaseNote) => void;
  onEdit: (releaseNote: ReleaseNote) => void;
  onMarkDeployed: (id: number) => void;
  onMarkDeploymentStarted: (id: number) => void;
  onDelete: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  markDeployedPending: boolean;
  markDeploymentStartedPending: boolean;
  deletePending: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onDeselect: (id: number) => void;
  onTaskClick?: (taskId: number) => void;
  onServiceClick?: (serviceId: number) => void;
}) => {
  return (
    <div className="space-y-4">
      {releaseNotes.map((releaseNote) => (
        <ReleaseNoteItem
          key={releaseNote.id}
          releaseNote={releaseNote}
          onView={onView}
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
          onTaskClick={onTaskClick}
          onServiceClick={onServiceClick}
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
    prevProps.onView === nextProps.onView &&
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
    prevProps.onDeselect === nextProps.onDeselect &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.onServiceClick === nextProps.onServiceClick
  );
});
ReleaseNotesList.displayName = 'ReleaseNotesList';

/**
 * ReleaseNotesPage component for managing release notes
 */
export function ReleaseNotesPage() {
  usePageTitle('Release Notes');
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [releaseNoteToDelete, setReleaseNoteToDelete] = useState<number | null>(null);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  
  // Initialize from URL params
  const urlFilters = useMemo(() => deserializeFiltersFromUrl(searchParams), [searchParams]);
  const [advancedFilters, setAdvancedFilters] = useState<Filter | undefined>(urlFilters.filters);
  const [orderBy, setOrderBy] = useState<OrderByItem[] | undefined>(
    Array.isArray(urlFilters.orderBy) ? urlFilters.orderBy : urlFilters.orderBy ? [urlFilters.orderBy] : undefined
  );
  const [groupBy, setGroupBy] = useState<GroupByItem[] | undefined>(urlFilters.groupBy);
  
  // Initialize status filter from URL params (for backward compatibility)
  const initialStatusFilter = (searchParams.get('status') as 'pending' | 'deployed' | 'deployment_started' | 'all') || 'all';
  const [statusFilter, setStatusFilter] = useState<'pending' | 'deployed' | 'deployment_started' | 'all'>(initialStatusFilter);
  const [releaseNoteModalOpen, setReleaseNoteModalOpen] = useState(false);
  const [selectedReleaseNoteForEdit, setSelectedReleaseNoteForEdit] = useState<ReleaseNote | null>(null);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  // Initialize side panel from URL params
  const urlReleaseNoteId = searchParams.get('releaseNoteId');
  const {
    panelId: sidePanelReleaseNoteId,
    openPanel: openReleaseNotePanel,
    closePanel: closeReleaseNotePanel,
  } = useSidePanelSync('releaseNoteId', urlReleaseNoteId ? Number(urlReleaseNoteId) : null);
  
  const {
    panelId: sidePanelTaskId,
    openPanel: openTaskPanel,
    closePanel: closeTaskPanel,
  } = useSidePanelSync('taskId', null);
  
  const {
    panelId: sidePanelServiceId,
    openPanel: openServicePanel,
    closePanel: closeServicePanel,
  } = useSidePanelSync('serviceId', null);

  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['release-notes', 'filter-metadata'],
    queryFn: () => getReleaseNotesFilterMetadata(),
  });

  // Real-time invalidation for release notes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    socket.on('release-note:changed', refetch);
    return () => {
      socket.off('release-note:changed', refetch);
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
    data: advancedReleaseNotesData,
    isLoading: advancedReleaseNotesLoading,
    isFetching: isFetchingAdvancedReleaseNotes,
    error: advancedReleaseNotesError,
    fetchNextPage: fetchNextAdvancedReleaseNotesPage,
    hasNextPage: hasNextAdvancedReleaseNotesPage,
    isFetchingNextPage: isFetchingNextAdvancedReleaseNotesPage,
    refetch: refetchAdvancedReleaseNotes,
  } = useReleaseNotesAdvanced(
    {
      filters: advancedFilters,
      search: debouncedSearch || undefined,
      orderBy: apiOrderBy,
      groupBy: groupBy && groupBy.length > 0 ? groupBy : undefined,
    },
    20
  );

  // Legacy filtering hook (for backward compatibility)
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
    undefined
  );

  // Choose which data to use
  const releaseNotesDataToUse = useAdvancedFiltering ? advancedReleaseNotesData : releaseNotesData;
  const releaseNotesLoadingToUse = useAdvancedFiltering ? advancedReleaseNotesLoading : releaseNotesLoading;
  const isFetchingReleaseNotesToUse = useAdvancedFiltering ? isFetchingAdvancedReleaseNotes : isFetchingReleaseNotes;
  const releaseNotesErrorToUse = useAdvancedFiltering ? advancedReleaseNotesError : releaseNotesError;
  const fetchNextReleaseNotesPageToUse = useAdvancedFiltering ? fetchNextAdvancedReleaseNotesPage : fetchNextReleaseNotesPage;
  const hasNextReleaseNotesPageToUse = useAdvancedFiltering ? hasNextAdvancedReleaseNotesPage : hasNextReleaseNotesPage;
  const isFetchingNextReleaseNotesPageToUse = useAdvancedFiltering ? isFetchingNextAdvancedReleaseNotesPage : isFetchingNextReleaseNotesPage;

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
    if (!releaseNotesDataToUse?.pages) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    const flattened = releaseNotesDataToUse.pages.flatMap((page) => page.data);
    // Update ref with new data
    previousDataRef.current = flattened;
    return flattened;
  }, [releaseNotesDataToUse]);

  const groupedReleaseNotes = useMemo<GroupNode<ReleaseNote>[] | undefined>(() => {
    if (!releaseNotesDataToUse?.pages) {
      return undefined;
    }

    type InternalGroup = { node: GroupNode<ReleaseNote>; order: number };
    const groupMap = new Map<string, InternalGroup>();
    let orderCounter = 0;

    releaseNotesDataToUse.pages.forEach((page) => {
      if (!page.groupedData || page.groupedData.length === 0) {
        return;
      }

      page.groupedData.forEach((group) => {
        const rawKey =
          group.key === null || group.key === undefined
            ? group.meta?.serviceId ?? group.label ?? 'unknown'
            : group.key;
        const mapKey = String(rawKey);

        if (!groupMap.has(mapKey)) {
          groupMap.set(mapKey, {
            node: {
              key: mapKey,
              label: group.label || 'No Service',
              items: [...group.items],
              meta: group.meta,
            },
            order: orderCounter++,
          });
        } else {
          const existing = groupMap.get(mapKey)!;
          existing.node.items = existing.node.items.concat(group.items);
        }
      });
    });

    if (groupMap.size === 0) {
      return undefined;
    }

    return Array.from(groupMap.values())
      .sort((a, b) => a.order - b.order)
      .map(({ node }) => node);
  }, [releaseNotesDataToUse]);

  // Infinite scroll observer
  const releaseNotesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextReleaseNotesPageToUse ?? false,
    isFetchingNextPage: isFetchingNextReleaseNotesPageToUse,
    fetchNextPage: fetchNextReleaseNotesPageToUse,
  });

  // Memoize handlers to prevent re-renders - MUST be called before any conditional returns
  const handleStatusFilterChange = useCallback((value: 'pending' | 'deployed' | 'deployment_started' | 'all') => {
    setStatusFilter(value);
    // Clear advanced filters when using quick status filter
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setGroupBy(undefined);
    // Update URL params
    if (value === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ status: value }, { replace: true });
    }
  }, [setSearchParams]);

  const handleAdvancedFiltersApply = useCallback((filters: Filter | undefined, newOrderBy?: OrderByItem[], newGroupBy?: GroupByItem[]) => {
    setAdvancedFilters(filters);
    setOrderBy(newOrderBy);
    setGroupBy(newGroupBy);
    // Clear status filter when using advanced filters
    setStatusFilter('all');
    // Update URL params
    const params = serializeFiltersToUrl(filters, debouncedSearch || undefined, newOrderBy, newGroupBy);
    setSearchParams(params, { replace: true });
    // Force refetch even if filters are the same (data might have changed on backend)
    if (useAdvancedFiltering) {
      refetchAdvancedReleaseNotes();
    }
  }, [debouncedSearch, setSearchParams, useAdvancedFiltering, refetchAdvancedReleaseNotes]);

  const handleAdvancedFiltersClear = useCallback(() => {
    setAdvancedFilters(undefined);
    setOrderBy(undefined);
    setGroupBy(undefined);
    setStatusFilter('all');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleCreateReleaseNote = useCallback(() => {
    setSelectedReleaseNoteForEdit(null);
    setReleaseNoteModalOpen(true);
  }, []);

  const handleViewReleaseNote = useCallback((releaseNote: ReleaseNote) => {
    openReleaseNotePanel(releaseNote.id);
  }, [openReleaseNotePanel]);

  const handleEditReleaseNote = useCallback((releaseNote: ReleaseNote) => {
    setSelectedReleaseNoteForEdit(releaseNote);
    setReleaseNoteModalOpen(true);
  }, []);

  const handleEditFromDetail = useCallback((releaseNoteId: number) => {
    // Find the release note from the current list
    const releaseNote = releaseNotes.find(rn => rn.id === releaseNoteId);
    if (releaseNote) {
      closeReleaseNotePanel();
      setSelectedReleaseNoteForEdit(releaseNote);
      setReleaseNoteModalOpen(true);
    }
  }, [releaseNotes, closeReleaseNotePanel]);

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

  const handleBulkActionApply = useCallback(
    async (action: string | null) => {
      if (!action || selectedIds.size === 0) return;
      const ids = Array.from(selectedIds);

      try {
        if (action === 'delete') {
          await bulkDeleteReleaseNotes.mutateAsync(ids);
          setSelectedIds(new Set());
          toast.success('Release notes deleted');
        } else if (action === 'deployment_started') {
          await bulkMarkDeploymentStarted.mutateAsync(ids);
          setSelectedIds(new Set());
          toast.success('Marked deployment started');
        } else if (action === 'deployed') {
          await bulkMarkDeployed.mutateAsync(ids);
          setSelectedIds(new Set());
          toast.success('Marked deployed');
        }
      } catch {
        // handled by toasts in mutations if configured
      }
    },
    [bulkDeleteReleaseNotes, bulkMarkDeployed, bulkMarkDeploymentStarted, selectedIds]
  );

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
  }, [debouncedSearch, statusFilter, advancedFilters]);

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
  const shouldShowGroupedView = Boolean(
    groupedReleaseNotes && groupedReleaseNotes.length > 0 && groupBy && groupBy.length > 0
  );

  // Only show loading on initial load when there's truly no data
  // placeholderData keeps previous data during refetches, so we don't flicker
  if (releaseNotesLoadingToUse && releaseNotes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (releaseNotesErrorToUse) {
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
        onAdvancedFiltersClick={() => setAdvancedFiltersOpen(true)}
        onShareClick={() => setShareLinkModalOpen(true)}
        hasActiveAdvancedFilters={hasActiveFilters(advancedFilters) || false}
        hasPermission={hasPermission}
      />

      {/* Selection bar shown only when items are selected */}
      {selectedIds.size > 0 && (
        <SelectionBar
          count={selectedIds.size}
          options={[
            ...(hasPermission('release-notes:deploy') && canBulkMarkDeploymentStarted
              ? [{ value: 'deployment_started', label: 'Mark Deployment Started' }]
              : []),
            ...(hasPermission('release-notes:deploy') && canBulkMarkDeployed
              ? [{ value: 'deployed', label: 'Mark Deployed' }]
              : []),
            ...(hasPermission('release-notes:delete') && canBulkDelete
              ? [{ value: 'delete', label: 'Delete' }]
              : []),
          ]}
          onApply={handleBulkActionApply}
          onCancel={handleDeselectAll}
          placeholder="Select action..."
          applyLabel="Apply"
          leftContent={
            <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => (isAllSelected ? handleDeselectAll() : handleSelectAll())}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50"
              />
              <span>{selectedIds.size} selected</span>
            </div>
          }
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
      ) : shouldShowGroupedView && groupedReleaseNotes ? (
        <>
          <GroupedList
            items={releaseNotes}
            groups={groupedReleaseNotes}
            collapseLeaves
            renderContainer={(children) => <div className="space-y-6">{children}</div>}
            renderHeader={({ group, isExpanded, toggle, canToggle }) => (
              <button
                onClick={() => canToggle && toggle()}
                className="rounded-2xl border border-gray-800/60 bg-[#101a24] px-4 py-3 flex items-center justify-between text-left w-full transition-colors hover:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {canToggle ? (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-300">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {group.label || 'No Service'}
                    </span>
                    {group.meta?.servicePort && (
                      <span className="text-xs text-gray-400">Port {group.meta.servicePort}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {group.items.length} {group.items.length === 1 ? 'release' : 'releases'}
                </span>
              </button>
            )}
            renderItems={(groupItems) => (
              <div className="space-y-4 mt-3">
                {groupItems.map((releaseNote) => (
                  <ReleaseNoteItem
                    key={releaseNote.id}
                    releaseNote={releaseNote}
                    onView={handleViewReleaseNote}
                    onEdit={handleEditReleaseNote}
                    onMarkDeployed={handleMarkDeployed}
                    onMarkDeploymentStarted={handleMarkDeploymentStarted}
                    onDelete={handleDeleteReleaseNote}
                    hasPermission={hasPermission}
                    markDeployedPending={markDeployed.isPending}
                    markDeploymentStartedPending={markDeploymentStarted.isPending}
                    deletePending={deleteReleaseNote.isPending}
                    isSelected={selectedIds.has(releaseNote.id)}
                    onSelect={handleSelect}
                    onDeselect={handleDeselect}
                    onTaskClick={openTaskPanel}
                    onServiceClick={openServicePanel}
                  />
                ))}
              </div>
            )}
          />
          <div ref={releaseNotesObserverTarget as any} className="h-4" />
          {isFetchingNextReleaseNotesPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      ) : (
        <ReleaseNotesList
          releaseNotes={releaseNotes}
          onView={handleViewReleaseNote}
          onEdit={handleEditReleaseNote}
          onMarkDeployed={handleMarkDeployed}
          onMarkDeploymentStarted={handleMarkDeploymentStarted}
          onDelete={handleDeleteReleaseNote}
          hasPermission={hasPermission}
          markDeployedPending={markDeployed.isPending}
          markDeploymentStartedPending={markDeploymentStarted.isPending}
          deletePending={deleteReleaseNote.isPending}
          observerTarget={releaseNotesObserverTarget as any}
          isFetchingNextPage={isFetchingNextReleaseNotesPage}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          onTaskClick={openTaskPanel}
          onServiceClick={openServicePanel}
        />
      )}

      {/* Advanced Filters Panel */}
      {filterMetadata && (
        <AdvancedFiltersPanel
          pageId="release-notes"
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

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={shareLinkModalOpen}
        onClose={() => setShareLinkModalOpen(false)}
        filters={hasActiveFilters(advancedFilters) ? advancedFilters : undefined}
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

      {/* Release Note Details Side Panel */}
      <ReleaseNoteDetailsSidePanel
        isOpen={sidePanelReleaseNoteId !== null}
        onClose={closeReleaseNotePanel}
        releaseNoteId={sidePanelReleaseNoteId}
        onTaskClick={openTaskPanel}
        onServiceClick={openServicePanel}
        onEdit={handleEditFromDetail}
      />

      {/* Task Details Side Panel */}
      <TaskDetailsSidePanel
        isOpen={sidePanelTaskId !== null}
        onClose={closeTaskPanel}
        taskId={sidePanelTaskId}
        onTaskClick={openTaskPanel}
      />
      <ServiceDetailsSidePanel
        isOpen={sidePanelServiceId !== null}
        onClose={closeServicePanel}
        serviceId={sidePanelServiceId}
        onServiceClick={openServicePanel}
        onServerClick={(id) => {/* Could add server side panel if needed */}}
        onCredentialClick={(id) => {/* Could add credential side panel if needed */}}
      />
    </div>
  );
}

