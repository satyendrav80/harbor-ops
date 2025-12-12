import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReleaseNoteShareLinks, deleteReleaseNoteShareLink, type ReleaseNoteShareLink } from '../../../services/releaseNotes';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ShareLinkCard } from '../components/ShareLinkCard';
import { toast } from 'react-hot-toast';
import { Link2 } from 'lucide-react';

export function ShareLinksPage() {
  const queryClient = useQueryClient();

  const { data: shareLinks, isLoading, error } = useQuery({
    queryKey: ['release-note-share-links'],
    queryFn: getReleaseNoteShareLinks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReleaseNoteShareLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-note-share-links'] });
      toast.success('Share link deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete share link');
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load share links. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Share Links
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your public share links for release notes. Share links allow others to view filtered release notes without requiring login.
        </p>
      </div>

      {!shareLinks || shareLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No share links"
          description="You haven't created any share links yet. Create one from the release notes page to get started."
        />
      ) : (
        <div className="space-y-4">
          {shareLinks.map((shareLink) => (
            <ShareLinkCard
              key={shareLink.id}
              shareLink={shareLink}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
