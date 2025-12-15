import { useState } from 'react';
import { type ReleaseNoteShareLink } from '../../../services/releaseNotes';
import { CopyButton } from '../../../components/common/CopyButton';
import { Trash2, ExternalLink, Calendar, Eye, Clock } from 'lucide-react';
import dayjs from '../../../utils/dayjs';
import { formatLocal, formatLocalDate } from '../../../utils/dateTime';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';

type ShareLinkCardProps = {
  shareLink: ReleaseNoteShareLink;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export function ShareLinkCard({ shareLink, onDelete, isDeleting }: ShareLinkCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const shareUrl = `${window.location.origin}/release-notes/public/${shareLink.shareToken}`;
  
  const isExpired = shareLink.expiresAt 
    ? dayjs(shareLink.expiresAt).isBefore(dayjs())
    : false;

  const formatFilters = (filters: any): string => {
    if (!filters || typeof filters !== 'object') return 'No filters';
    
    const parts: string[] = [];
    
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      parts.push(`Status: ${filters.status.join(', ')}`);
    }
    
    if (filters.serviceId && Array.isArray(filters.serviceId) && filters.serviceId.length > 0) {
      parts.push(`${filters.serviceId.length} service(s)`);
    }
    
    if (filters.createdBy && Array.isArray(filters.createdBy) && filters.createdBy.length > 0) {
      parts.push(`${filters.createdBy.length} creator(s)`);
    }
    
    if (filters.publishDate) {
      if (filters.publishDate.from || filters.publishDate.to) {
        const dateRange = [];
        if (filters.publishDate.from) {
          dateRange.push(`from ${dayjs(filters.publishDate.from).format('MMM D, YYYY')}`);
        }
        if (filters.publishDate.to) {
          dateRange.push(`to ${dayjs(filters.publishDate.to).format('MMM D, YYYY')}`);
        }
        parts.push(`Publish date: ${dateRange.join(' ')}`);
      }
    }
    
    if (filters.taskIds && Array.isArray(filters.taskIds) && filters.taskIds.length > 0) {
      parts.push(`${filters.taskIds.length} task(s)`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All release notes';
  };

  return (
    <>
      <div className={`rounded-lg border p-4 transition-colors ${
        isExpired
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 opacity-60'
          : 'bg-white dark:bg-[#1C252E] border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Share Link
                  </h3>
                  {isExpired && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                      Expired
                    </span>
                  )}
                  {!isExpired && !shareLink.expiresAt && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                      Active
                    </span>
                  )}
                  {!isExpired && shareLink.expiresAt && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      Active
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white font-mono"
                  />
                  <CopyButton text={shareUrl} iconOnly={true} />
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Created {formatLocalDate(shareLink.createdAt)}
                    </span>
                  </div>
                  
                  {shareLink.expiresAt ? (
                    <div className={`flex items-center gap-1.5 ${
                      isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {isExpired ? 'Expired' : 'Expires'} {formatLocalDate(shareLink.expiresAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Never expires</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{shareLink.viewCount} view{shareLink.viewCount !== 1 ? 's' : ''}</span>
                  </div>
                  
                  {shareLink.lastViewedAt && (
                    <div className="flex items-center gap-1.5">
                      <span>
                        Last viewed {(dayjs(shareLink.lastViewedAt) as any).fromNow()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Filters:</span> {formatFilters(shareLink.filters)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete share link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(shareLink.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Share Link"
        message="Are you sure you want to delete this share link? This action cannot be undone and the link will no longer be accessible."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
