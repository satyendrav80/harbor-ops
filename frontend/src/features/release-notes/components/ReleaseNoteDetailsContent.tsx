import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReleaseNote } from '../../../services/releaseNotes';
import { Loading } from '../../../components/common/Loading';
import { ExpandableContent } from '../../../components/common/ExpandableContent';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { Edit, Cloud, CheckCircle, PlayCircle, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { formatLocal, formatLocalDetailed } from '../../../utils/dateTime';
import { useMarkReleaseNoteDeployed, useMarkReleaseNoteDeploymentStarted, useDeleteReleaseNote } from '../hooks/useReleaseNoteMutations';
import { useState, useEffect } from 'react';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { toast } from 'react-hot-toast';
import { getSocket } from '../../../services/socket';
import { CopyButton } from '../../../components/common/CopyButton';
import { groupReleaseNoteTasks } from '../utils/groupReleaseNoteTasks';

type ReleaseNoteDetailsContentProps = {
  releaseNoteId: number;
  onTaskClick?: (taskId: number) => void;
  onServiceClick?: (serviceId: number) => void;
  onEdit?: (releaseNoteId: number) => void;
  onClose?: () => void;
};

export function ReleaseNoteDetailsContent({
  releaseNoteId,
  onTaskClick,
  onServiceClick,
  onEdit,
  onClose,
}: ReleaseNoteDetailsContentProps) {
  const { hasPermission } = useAuth();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const [isDeleted, setIsDeleted] = useState(false);
  
  // Reset deleted state when releaseNoteId changes
  useEffect(() => {
    setIsDeleted(false);
  }, [releaseNoteId]);
  
  const { data: releaseNote, isLoading, error } = useQuery({
    queryKey: ['release-note', releaseNoteId],
    queryFn: () => getReleaseNote(releaseNoteId),
    retry: false, // Don't retry if the item doesn't exist
    enabled: !!releaseNoteId && !isDeleted, // Don't fetch if deleted
  });

  const markDeployed = useMarkReleaseNoteDeployed();
  const markDeploymentStarted = useMarkReleaseNoteDeploymentStarted();
  const deleteReleaseNote = useDeleteReleaseNote();

  // Close panel if release note was deleted (error or not found)
  useEffect(() => {
    if (error || (!isLoading && !releaseNote)) {
      setIsDeleted(true);
      // Small delay to show the "not found" message briefly
      const timer = setTimeout(() => {
        onClose?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, isLoading, releaseNote, onClose]);

  // Real-time updates for release note changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !releaseNoteId || isDeleted) return;
    
    const handleReleaseNoteChanged = () => {
      // Only invalidate if the query still exists, isn't deleted, and component is still mounted
      if (isDeleted) return;
      
      const queryState = queryClient.getQueryState(['release-note', releaseNoteId]);
      // Check if query exists and isn't in error state (which might indicate deletion)
      if (queryState && queryState.status !== 'error') {
        queryClient.invalidateQueries({ queryKey: ['release-note', releaseNoteId] });
      }
    };
    
    socket.on('release-note:changed', handleReleaseNoteChanged);
    return () => {
      socket.off('release-note:changed', handleReleaseNoteChanged);
    };
  }, [releaseNoteId, queryClient, isDeleted]);


  const handleDelete = async () => {
    if (!releaseNote) return;
    try {
      // Mark as deleted immediately to prevent further queries
      setIsDeleted(true);
      // Cancel any ongoing queries for this release note
      queryClient.cancelQueries({ queryKey: ['release-note', releaseNote.id] });
      // Set query data to null to prevent refetches
      queryClient.setQueryData(['release-note', releaseNote.id], null);
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['release-note', releaseNote.id] });
      
      await deleteReleaseNote.mutateAsync(releaseNote.id);
      toast.success('Release note deleted successfully');
      setDeleteConfirmOpen(false);
      // Close the panel after successful deletion
      onClose?.();
    } catch (error: any) {
      // If deletion fails, re-enable queries
      setIsDeleted(false);
      toast.error(error.message || 'Failed to delete release note');
    }
  };

  // Handle loading state
  if (isLoading) {
    return <Loading />;
  }

  // Handle error state (e.g., 404 when item was deleted)
  if (error || !releaseNote) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Release note not found
      </div>
    );
  }

  const typeIcons: Record<string, string> = {
    bug: '🐛',
    feature: '✨',
    todo: '📝',
    epic: '🎯',
    improvement: '⚡',
  };
  const { primaryTasks, otherTasks } = groupReleaseNoteTasks(releaseNote.tasks, releaseNote.serviceId);
  const renderTask = (
    releaseNoteTask: NonNullable<typeof releaseNote.tasks>[number],
    showServiceBadge?: boolean
  ) => {
    const task = releaseNoteTask.task;
    if (!task) return null;
    return (
      <div key={task.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcons[task.type] || '📝'}</span>
          <button
            onClick={() => onTaskClick?.(task.id)}
            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors text-left"
          >
            {task.title}
          </button>
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
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
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
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyButton
            text={`${window.location.origin}/release-notes?releaseNoteId=${releaseNoteId}`}
            iconOnly={true}
          />
          {hasPermission('release-notes:update') && releaseNote.status === 'pending' && (
            <button
              onClick={() => onEdit?.(releaseNote.id)}
              className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
              aria-label="Edit release note"
              title="Edit release note"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {hasPermission('release-notes:delete') && releaseNote.status === 'pending' && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteReleaseNote.isPending}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
              aria-label="Delete release note"
              title="Delete release note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {hasPermission('release-notes:deploy') && releaseNote.status === 'pending' && (
            <button
              onClick={() => markDeploymentStarted.mutate(releaseNote.id)}
              disabled={markDeploymentStarted.isPending}
              className="text-gray-400 dark:text-gray-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded p-1 disabled:opacity-50"
              aria-label="Mark deployment started"
              title="Mark deployment started"
            >
              <PlayCircle className="w-4 h-4" />
            </button>
          )}

          {hasPermission('release-notes:deploy') && (releaseNote.status === 'pending' || releaseNote.status === 'deployment_started') && (
            <button
              onClick={() => markDeployed.mutate(releaseNote.id)}
              disabled={markDeployed.isPending}
              className="text-gray-400 dark:text-gray-500 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded p-1 disabled:opacity-50"
              aria-label="Mark as deployed"
              title="Mark as deployed"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div>
        <ExpandableContent
          label="Content"
          placeholder='Click "Expand" to view full content'
          defaultExpanded={true}
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
                      primaryTasks.length > 0 ? 'pt-4 border-t border-gray-200 dark:border-gray-700' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Other Services</p>
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
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Service</p>
          <button
            onClick={() => onServiceClick?.(releaseNote.serviceId)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
            title={`Click to view service ${releaseNote.service.name}`}
          >
            <Cloud className="w-3 h-3" />
            {releaseNote.service.name} (:{releaseNote.service.port})
          </button>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {releaseNote.publishDate && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Publish Date:</span>{' '}
            {formatLocal(releaseNote.publishDate)}
          </div>
        )}
        {releaseNote.deployedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-green-700 dark:text-green-300">Deployed:</span>{' '}
            {formatLocal(releaseNote.deployedAt)}
          </div>
        )}
        {releaseNote.createdAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Created:</span>{' '}
            {formatLocalDetailed(releaseNote.createdAt)}
            {releaseNote.createdByUser && ` by ${releaseNote.createdByUser.name || releaseNote.createdByUser.email}`}
          </div>
        )}
        {releaseNote.updatedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Updated:</span>{' '}
            {formatLocalDetailed(releaseNote.updatedAt)}
            {releaseNote.updatedByUser && ` by ${releaseNote.updatedByUser.name || releaseNote.updatedByUser.email}`}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Release Note"
        message="Are you sure you want to delete this release note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteReleaseNote.isPending}
      />
    </div>
  );
}
