import { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { createReleaseNoteShareLink, type ReleaseNoteShareLink } from '../../../services/releaseNotes';
import { toast } from 'react-hot-toast';
import dayjs from '../../../utils/dayjs';
import { hasActiveFilters } from '../utils/filterState';
import { CopyButton } from '../../../components/common/CopyButton';

type ShareLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filters?: any;
  onShareLinkCreated?: (shareLink: ReleaseNoteShareLink) => void;
};

export function ShareLinkModal({ isOpen, onClose, filters, onShareLinkCreated }: ShareLinkModalProps) {
  const [expiresInDays, setExpiresInDays] = useState<number | null>(2);
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<ReleaseNoteShareLink | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCreatedLink(null);
      setExpiresInDays(2);
    }
  }, [isOpen]);

  const hasFilters = filters && hasActiveFilters(filters);

  const handleCreate = async () => {
    // Validate that at least one filter is present
    if (!hasFilters) {
      toast.error('Please apply at least one filter before creating a share link');
      return;
    }

    setIsCreating(true);
    try {
      const shareLink = await createReleaseNoteShareLink(filters, expiresInDays);
      setCreatedLink(shareLink);
      onShareLinkCreated?.(shareLink);
      toast.success('Share link created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const shareUrl = createdLink ? `${window.location.origin}/release-notes/public/${createdLink.shareToken}` : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Public Share Link" size="md">
      <div className="space-y-4">
        {!createdLink ? (
          <>
            {!hasFilters && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please apply at least one filter before creating a share link. This ensures the shared link shows a specific set of release notes.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry (days)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={expiresInDays === null ? '' : expiresInDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExpiresInDays(value === '' ? null : Number(value));
                  }}
                  placeholder="Never expires"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setExpiresInDays(null)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    expiresInDays === null
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  Never
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Default: 2 days. Set to "Never" for links that don't expire.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !hasFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white"
                  />
                  <CopyButton text={shareUrl} iconOnly={true} />
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {createdLink.expiresAt && (
                  <p>
                    Expires: {dayjs.utc(createdLink.expiresAt).format('D MMM YYYY, HH:mm')}
                  </p>
                )}
                {!createdLink.expiresAt && (
                  <p>Never expires</p>
                )}
                <p>Views: {createdLink.viewCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreatedLink(null);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
